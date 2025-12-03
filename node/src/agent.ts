import axios, { AxiosInstance } from 'axios';
import PQueue from 'p-queue';
import { FragmentTask, generateShadowWallet } from '@xvoid/common';
import { config } from './config';
import { logger } from './logger';
import { SolanaExecutor } from './solanaExecutor';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class NodeAgent {
  private readonly http: AxiosInstance;
  private readonly queue: PQueue;
  private heartbeatTimer?: NodeJS.Timeout;
  private readonly executor: SolanaExecutor;

  constructor(
    private readonly cfg = config,
    executor?: SolanaExecutor
  ) {
    this.http = axios.create({
      baseURL: cfg.coordinatorUrl,
      timeout: cfg.requestTimeout
    });
    this.queue = new PQueue({ concurrency: cfg.capacity });
    this.executor =
      executor ??
      new SolanaExecutor({
        rpcUrl: cfg.rpcUrl,
        secretKey: cfg.hotWalletSecret || undefined,
        simulate: cfg.simulateTransfers
      });
  }

  async start(): Promise<void> {
    await this.register();
    this.startHeartbeat();
    await this.pollLoop();
  }

  private async register(): Promise<void> {
    logger.info(
      {
        nodeId: this.cfg.nodeId,
        endpoint: this.cfg.endpoint,
        capacity: this.cfg.capacity
      },
      'Registering node'
    );

    await this.http.post('/nodes/register', {
      nodeId: this.cfg.nodeId,
      capacity: this.cfg.capacity,
      endpoint: this.cfg.endpoint
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.http
        .post('/nodes/heartbeat', { nodeId: this.cfg.nodeId })
        .catch((err) =>
          logger.warn({ err }, 'Heartbeat failed')
        );
    }, this.cfg.heartbeatInterval);
  }

  private async pollLoop(): Promise<void> {
    while (true) {
      try {
        const { data } = await this.http.get('/tasks/next', {
          params: { nodeId: this.cfg.nodeId }
        });

        if (!data || data.task === null) {
          await sleep(this.cfg.pollInterval);
          continue;
        }

        const fragment: FragmentTask = data;
        this.queue.add(() => this.processFragment(fragment)).catch((err) =>
          logger.error({ err, fragmentId: fragment.fragmentId }, 'Worker failed')
        );
      } catch (error) {
        logger.error({ err: error }, 'Polling loop error');
        await sleep(this.cfg.pollInterval);
      }
    }
  }

  private async processFragment(fragment: FragmentTask): Promise<void> {
    logger.info(
      { fragmentId: fragment.fragmentId, trackingId: fragment.trackingId },
      'Processing fragment'
    );

    await sleep(fragment.delayMs);

    const shadowWallets = Array.from({ length: fragment.shadowWalletCount }, () =>
      generateShadowWallet()
    );

    try {
      for (let i = 0; i < fragment.noiseTxCount; i += 1) {
        const wallet =
          shadowWallets[i % (shadowWallets.length || 1)] ?? generateShadowWallet();
        await this.executor.sendNoiseTransfer(wallet.publicKey);
      }

      const signature = await this.executor.sendFragment(fragment);
      await this.report(fragment, 'completed', signature);
      logger.info(
        { fragmentId: fragment.fragmentId, signature },
        'Fragment completed'
      );
    } catch (error) {
      logger.error({ err: error, fragmentId: fragment.fragmentId }, 'Fragment failed');
      await this.report(fragment, 'failed', null, error as Error);
    }
  }

  private async report(
    fragment: FragmentTask,
    status: 'completed' | 'failed',
    signature: string | null,
    error?: Error
  ): Promise<void> {
    try {
      await this.http.post('/tasks/report', {
        nodeId: this.cfg.nodeId,
        trackingId: fragment.trackingId,
        fragmentId: fragment.fragmentId,
        status,
        signature,
        error: error?.message
      });
    } catch (reportError) {
      logger.error(
        { err: reportError, fragmentId: fragment.fragmentId },
        'Failed to report fragment'
      );
    }
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    await this.queue.onIdle();
    logger.info('Node agent stopped');
  }
}

