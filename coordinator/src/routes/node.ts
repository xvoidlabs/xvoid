import { Router } from "express";
import {
  RegisterNodeRequest,
  HeartbeatRequest,
  ReportTaskRequest,
} from "@xvoid/common";
import { storage } from "../storage";

const router = Router();

/**
 * POST /nodes/register
 * Register a new node
 */
router.post("/register", (req, res) => {
  try {
    const body: RegisterNodeRequest = req.body;

    if (!body.nodeId || body.capacity === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const node = {
      nodeId: body.nodeId,
      capacity: body.capacity,
      lastHeartbeat: Date.now(),
      registeredAt: Date.now(),
    };

    storage.registerNode(node);

    res.json({ success: true });
  } catch (error) {
    console.error("Error registering node:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /nodes/heartbeat
 * Update node heartbeat
 */
router.post("/heartbeat", (req, res) => {
  try {
    const body: HeartbeatRequest = req.body;

    if (!body.nodeId) {
      return res.status(400).json({ error: "Missing nodeId" });
    }

    const node = storage.getNode(body.nodeId);
    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    storage.updateNodeHeartbeat(body.nodeId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating heartbeat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /tasks/next
 * Get next pending task for a node
 */
router.get("/next", (req, res) => {
  try {
    const nodeId = req.query.nodeId as string;

    if (!nodeId) {
      return res.status(400).json({ error: "Missing nodeId query parameter" });
    }

    const task = storage.getNextPendingTask(nodeId);

    if (!task) {
      return res.json(null);
    }

    // Mark as assigned
    storage.updateFragment(task.id, { status: "assigned" });

    res.json(task);
  } catch (error) {
    console.error("Error getting next task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tasks/report
 * Report task completion or failure
 */
router.post("/report", (req, res) => {
  try {
    const body: ReportTaskRequest = req.body;

    if (!body.nodeId || !body.fragmentId || !body.intentId || !body.status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fragment = storage.getFragment(body.fragmentId);
    if (!fragment) {
      return res.status(404).json({ error: "Fragment not found" });
    }

    if (fragment.assignedNodeId !== body.nodeId) {
      return res.status(403).json({ error: "Fragment not assigned to this node" });
    }

    // Update fragment
    storage.updateFragment(body.fragmentId, {
      status: body.status,
      txSignature: body.txSignature,
    });

    // Update intent status if all fragments are done
    const intent = storage.getIntent(body.intentId);
    if (intent) {
      const fragments = storage.getFragmentsByIntent(body.intentId);
      const allCompleted = fragments.every(
        (f) => f.status === "completed" || f.status === "failed"
      );
      const hasFailures = fragments.some((f) => f.status === "failed");

      if (allCompleted) {
        storage.updateIntent(body.intentId, {
          status: hasFailures ? "failed" : "completed",
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error reporting task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as nodeRouter };

