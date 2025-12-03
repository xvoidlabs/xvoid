import {
  FragmentReport,
  FragmentStatus,
  FragmentTask,
  NodeRegistration,
  PrivacyLevel,
  Task,
  TaskStatus
} from '@xvoid/common';

const STALE_NODE_THRESHOLD_MS = 30_000;

export interface TaskInput {
  trackingId: string;
  recipient: string;
  amount: number;
  privacyLevel: PrivacyLevel;
  fragments: FragmentTask[];
}

export class TaskStore {
  private tasks = new Map<string, Task>();
  private fragmentPayloads = new Map<string, FragmentTask>();
  private fragmentToTask = new Map<string, string>();
  private fragmentQueue: string[] = [];
  private nodes = new Map<string, NodeRegistration>();

  constructor(private readonly maxRetries = 3) {}

  registerNode(data: {
    nodeId: string;
    capacity: number;
    endpoint: string;
  }): NodeRegistration {
    const now = Date.now();
    const node: NodeRegistration = {
      nodeId: data.nodeId,
      endpoint: data.endpoint,
      capacity: data.capacity,
      load: 0,
      lastHeartbeat: now
    };

    this.nodes.set(node.nodeId, node);
    return node;
  }

  heartbeat(nodeId: string): NodeRegistration | null {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return null;
    }

    node.lastHeartbeat = Date.now();
    this.nodes.set(nodeId, node);
    return node;
  }

  getNodes(): NodeRegistration[] {
    return [...this.nodes.values()];
  }

  getNode(nodeId: string): NodeRegistration | undefined {
    return this.nodes.get(nodeId);
  }

  createTask(input: TaskInput): Task {
    const now = Date.now();

    const fragmentsStatus: FragmentStatus[] = input.fragments.map((fragment) => ({
      fragmentId: fragment.fragmentId,
      amount: fragment.amount,
      assignedNodeId: fragment.assignedNodeId,
      signature: null,
      status: 'pending',
      retries: 0,
      updatedAt: now
    }));

    const task: Task = {
      trackingId: input.trackingId,
      recipient: input.recipient,
      amount: input.amount,
      privacyLevel: input.privacyLevel,
      totalFragments: input.fragments.length,
      createdAt: now,
      updatedAt: now,
      fragments: fragmentsStatus
    };

    this.tasks.set(task.trackingId, task);

    input.fragments.forEach((fragment) => {
      this.fragmentPayloads.set(fragment.fragmentId, fragment);
      this.fragmentQueue.push(fragment.fragmentId);
      this.fragmentToTask.set(fragment.fragmentId, task.trackingId);
    });

    return task;
  }

  fetchNextTask(nodeId: string): FragmentTask | null {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return null;
    }

    if (node.load >= node.capacity) {
      return null;
    }

    const now = Date.now();

    const queueIndex = this.fragmentQueue.findIndex((fragmentId) => {
      const fragment = this.fragmentPayloads.get(fragmentId);
      if (!fragment) {
        return false;
      }

      if (fragment.assignedNodeId && fragment.assignedNodeId !== nodeId) {
        const assignedNode = this.nodes.get(fragment.assignedNodeId);
        if (
          assignedNode &&
          now - assignedNode.lastHeartbeat < STALE_NODE_THRESHOLD_MS
        ) {
          return false;
        }
      }

      const trackingId = this.fragmentToTask.get(fragmentId);
      if (!trackingId) {
        return false;
      }

      const task = this.tasks.get(trackingId);
      const fragmentStatus = task?.fragments.find((f) => f.fragmentId === fragmentId);
      return fragmentStatus?.status === 'pending';
    });

    if (queueIndex === -1) {
      return null;
    }

    const fragmentId = this.fragmentQueue.splice(queueIndex, 1)[0];
    const fragment = this.fragmentPayloads.get(fragmentId);
    if (!fragment) {
      return null;
    }

    fragment.assignedNodeId = nodeId;
    node.load = Math.min(node.capacity, node.load + 1);
    node.lastHeartbeat = now;
    this.nodes.set(nodeId, node);

    this.mutateFragment(fragment.trackingId, fragmentId, (state) => {
      state.status = 'assigned';
      state.assignedNodeId = nodeId;
    });

    return fragment;
  }

  reportFragment(report: FragmentReport): TaskStatus | null {
    const node = this.nodes.get(report.nodeId);
    if (node) {
      node.load = Math.max(0, node.load - 1);
      node.lastHeartbeat = Date.now();
      this.nodes.set(report.nodeId, node);
    }

    const trackingId = report.trackingId;
    const fragment = this.fragmentPayloads.get(report.fragmentId);
    if (!fragment) {
      return null;
    }

    if (report.status === 'completed') {
      this.mutateFragment(trackingId, report.fragmentId, (state) => {
        state.status = 'completed';
        state.signature = report.signature ?? null;
        state.lastError = undefined;
      });
    } else {
      let shouldRequeue = false;
      this.mutateFragment(trackingId, report.fragmentId, (state) => {
        state.retries += 1;
        state.lastError = report.error ?? 'Unknown failure';
        state.signature = null;

        if (state.retries >= this.maxRetries) {
          state.status = 'failed';
        } else {
          state.status = 'pending';
          shouldRequeue = true;
        }
      });

      const payload = this.fragmentPayloads.get(report.fragmentId);
      if (payload) {
        payload.assignedNodeId = undefined;
      }

      if (shouldRequeue) {
        this.fragmentQueue.push(report.fragmentId);
      }
    }

    return this.getTaskStatus(trackingId);
  }

  getTaskStatus(trackingId: string): TaskStatus | null {
    const task = this.tasks.get(trackingId);
    if (!task) {
      return null;
    }

    const completed = task.fragments.filter((f) => f.status === 'completed').length;
    const failed = task.fragments.filter((f) => f.status === 'failed').length;
    const pending = task.totalFragments - completed - failed;

    return {
      trackingId,
      totalFragments: task.totalFragments,
      completed,
      failed,
      pending
    };
  }

  private mutateFragment(
    trackingId: string,
    fragmentId: string,
    mutator: (fragment: FragmentStatus) => void
  ): void {
    const task = this.tasks.get(trackingId);
    if (!task) {
      return;
    }

    const fragment = task.fragments.find((f) => f.fragmentId === fragmentId);
    if (!fragment) {
      return;
    }

    mutator(fragment);
    fragment.updatedAt = Date.now();
    task.updatedAt = fragment.updatedAt;
  }
}

