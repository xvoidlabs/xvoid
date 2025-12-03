import express from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { routingEngine } from '@xvoid/ai-engine';
import { FragmentTask, PrivacyLevel } from '@xvoid/common';
import { config } from './config';
import { logger } from './logger';
import { TaskStore } from './store/taskStore';
import { SolanaMonitor } from './solanaMonitor';

const app = express();
app.use(cors());
app.use(express.json());

const taskStore = new TaskStore(config.maxRetries);
const solanaMonitor = new SolanaMonitor(config.rpcUrl);

const submitSchema = z.object({
  recipient: z.string().min(32),
  amount: z.coerce.number().positive(),
  privacyLevel: z.enum(['low', 'medium', 'high'])
});

const registerSchema = z.object({
  nodeId: z.string().min(3),
  capacity: z.coerce.number().int().positive(),
  endpoint: z.string().url()
});

const heartbeatSchema = z.object({
  nodeId: z.string().min(3)
});

const taskReportSchema = z.object({
  nodeId: z.string().min(3),
  trackingId: z.string().min(6),
  fragmentId: z.string().min(3),
  status: z.enum(['completed', 'failed']),
  signature: z.string().nullable().optional(),
  error: z.string().optional()
});

const asyncHandler =
  <T extends express.Request, U extends express.Response>(
    fn: (req: T, res: U, next: express.NextFunction) => Promise<unknown>
  ) =>
  (req: T, res: U, next: express.NextFunction): void => {
    fn(req, res, next).catch(next);
  };

app.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const payload = submitSchema.parse(req.body);
    const nodes = taskStore.getNodes();

    if (!nodes.length) {
      return res.status(400).json({ error: 'No swarm nodes registered' });
    }

    const trackingId = uuid();
    const tpsHint = await solanaMonitor.getTpsHint();

    const plan = routingEngine.buildPlan({
      trackingId,
      recipient: payload.recipient,
      amount: payload.amount,
      privacyLevel: payload.privacyLevel as PrivacyLevel,
      nodes,
      tpsHint
    });

    const fragments: FragmentTask[] = plan.fragments.map((fragment) => ({
      fragmentId: fragment.fragmentId,
      trackingId,
      recipient: payload.recipient,
      amount: fragment.amount,
      delayMs: fragment.delayMs,
      shadowWalletCount: fragment.shadowWalletCount,
      noiseTxCount: fragment.noiseTxCount,
      assignedNodeId: fragment.assignedNodeId
    }));

    taskStore.createTask({
      trackingId,
      recipient: payload.recipient,
      amount: payload.amount,
      privacyLevel: payload.privacyLevel as PrivacyLevel,
      fragments
    });

    logger.info(
      { trackingId, fragments: fragments.length, privacy: payload.privacyLevel },
      'Task submitted'
    );

    return res.json({ trackingId });
  })
);

app.post(
  '/nodes/register',
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const node = taskStore.registerNode(payload);
    logger.info({ nodeId: node.nodeId }, 'Node registered');
    return res.status(201).json(node);
  })
);

app.post(
  '/nodes/heartbeat',
  asyncHandler(async (req, res) => {
    const payload = heartbeatSchema.parse(req.body);
    const node = taskStore.heartbeat(payload.nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not registered' });
    }
    return res.json({ ok: true, load: node.load });
  })
);

app.get(
  '/tasks/next',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      nodeId: z.string().min(3)
    });

    const { nodeId } = querySchema.parse(req.query);

    const fragment = taskStore.fetchNextTask(nodeId);
    if (!fragment) {
      return res.json({ task: null });
    }

    return res.json(fragment);
  })
);

app.post(
  '/tasks/report',
  asyncHandler(async (req, res) => {
    const payload = taskReportSchema.parse(req.body);
    const normalizedPayload = {
      ...payload,
      signature: payload.signature ?? null
    };
    const status = taskStore.reportFragment(normalizedPayload);
    if (!status) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.json(status);
  })
);

app.get(
  '/tasks/:trackingId/status',
  asyncHandler(async (req, res) => {
    const { trackingId } = req.params;
    const status = taskStore.getTaskStatus(trackingId);
    if (!status) {
      return res.status(404).json({ error: 'Tracking ID not found' });
    }
    return res.json(status);
  })
);

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    nodes: taskStore.getNodes().length
  })
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Coordinator listening');
});

