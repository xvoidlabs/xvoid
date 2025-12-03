import {
  RouteIntent,
  FragmentTask,
  NodeInfo,
  TaskStatus,
  RouteIntentStatus,
} from "@xvoid/common";

/**
 * In-memory storage for MVP
 * TODO: Replace with Redis or database for production
 */
class Storage {
  private intents: Map<string, RouteIntent> = new Map();
  private fragments: Map<string, FragmentTask> = new Map();
  private nodes: Map<string, NodeInfo> = new Map();

  // Intent operations
  createIntent(intent: RouteIntent): void {
    this.intents.set(intent.id, intent);
  }

  getIntent(intentId: string): RouteIntent | undefined {
    return this.intents.get(intentId);
  }

  updateIntent(intentId: string, updates: Partial<RouteIntent>): void {
    const intent = this.intents.get(intentId);
    if (intent) {
      this.intents.set(intentId, {
        ...intent,
        ...updates,
        updatedAt: Date.now(),
      });
    }
  }

  // Fragment operations
  createFragment(fragment: FragmentTask): void {
    this.fragments.set(fragment.id, fragment);
  }

  getFragment(fragmentId: string): FragmentTask | undefined {
    return this.fragments.get(fragmentId);
  }

  getFragmentsByIntent(intentId: string): FragmentTask[] {
    return Array.from(this.fragments.values()).filter(
      (f) => f.intentId === intentId
    );
  }

  updateFragment(fragmentId: string, updates: Partial<FragmentTask>): void {
    const fragment = this.fragments.get(fragmentId);
    if (fragment) {
      this.fragments.set(fragmentId, {
        ...fragment,
        ...updates,
        updatedAt: Date.now(),
      });
    }
  }

  getNextPendingTask(nodeId: string): FragmentTask | null {
    const nodeFragments = Array.from(this.fragments.values()).filter(
      (f) => f.assignedNodeId === nodeId && f.status === "pending"
    );

    if (nodeFragments.length === 0) {
      return null;
    }

    // Return oldest pending task
    return nodeFragments.sort((a, b) => a.createdAt - b.createdAt)[0];
  }

  // Node operations
  registerNode(node: NodeInfo): void {
    this.nodes.set(node.nodeId, node);
  }

  getNode(nodeId: string): NodeInfo | undefined {
    return this.nodes.get(nodeId);
  }

  updateNodeHeartbeat(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.nodes.set(nodeId, {
        ...node,
        lastHeartbeat: Date.now(),
      });
    }
  }

  getAvailableNodes(): NodeInfo[] {
    const now = Date.now();
    const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

    return Array.from(this.nodes.values()).filter(
      (node) => now - node.lastHeartbeat < HEARTBEAT_TIMEOUT
    );
  }

  // Status operations
  getIntentStatus(intentId: string): RouteIntentStatus | null {
    const intent = this.intents.get(intentId);
    if (!intent) {
      return null;
    }

    const fragments = this.getFragmentsByIntent(intentId);
    const status: TaskStatus = {
      total: fragments.length,
      completed: fragments.filter((f) => f.status === "completed").length,
      pending: fragments.filter((f) => f.status === "pending" || f.status === "assigned").length,
      failed: fragments.filter((f) => f.status === "failed").length,
    };

    return {
      intent,
      fragments: status,
    };
  }
}

export const storage = new Storage();

