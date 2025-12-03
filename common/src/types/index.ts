export type PrivacyLevel = 'low' | 'medium' | 'high';

export interface NodeRegistration {
  nodeId: string;
  endpoint: string;
  capacity: number;
  load: number;
  lastHeartbeat: number;
}

export interface FragmentTask {
  fragmentId: string;
  trackingId: string;
  recipient: string;
  amount: number;
  delayMs: number;
  shadowWalletCount: number;
  noiseTxCount: number;
  assignedNodeId?: string;
}

export interface RoutingPlanFragment {
  fragmentId: string;
  amount: number;
  delayMs: number;
  shadowWalletCount: number;
  noiseTxCount: number;
  assignedNodeId?: string;
}

export interface RoutingPlan {
  trackingId: string;
  privacyLevel: PrivacyLevel;
  fragmentCount: number;
  fragments: RoutingPlanFragment[];
  createdAt: number;
}

export type FragmentLifecycleStatus =
  | 'pending'
  | 'assigned'
  | 'completed'
  | 'failed';

export interface FragmentStatus {
  fragmentId: string;
  amount: number;
  assignedNodeId?: string;
  signature?: string | null;
  status: FragmentLifecycleStatus;
  retries: number;
  lastError?: string;
  updatedAt: number;
}

export interface Task {
  trackingId: string;
  recipient: string;
  amount: number;
  privacyLevel: PrivacyLevel;
  totalFragments: number;
  createdAt: number;
  updatedAt: number;
  fragments: FragmentStatus[];
}

export interface TaskStatus {
  trackingId: string;
  totalFragments: number;
  completed: number;
  pending: number;
  failed: number;
}

export interface FragmentReport {
  nodeId: string;
  trackingId: string;
  fragmentId: string;
  status: 'completed' | 'failed';
  signature: string | null;
  error?: string;
}

