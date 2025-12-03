export type PrivacyLevel = "low" | "medium" | "high";

export interface RouteIntent {
  id: string;
  senderPubkey: string;
  recipient: string;
  amountLamports: number;
  privacyLevel: PrivacyLevel;
  status: "awaiting_deposit" | "deposit_confirmed" | "routing" | "completed" | "failed";
  depositTxSignature?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FragmentTask {
  id: string;
  intentId: string;
  recipient: string;
  amountLamports: number;
  delayMs: number;
  shadowWalletCount: number;
  noiseTxCount: number;
  assignedNodeId: string;
  status: "pending" | "assigned" | "completed" | "failed";
  txSignature?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NodeInfo {
  nodeId: string;
  capacity: number;
  lastHeartbeat: number;
  registeredAt: number;
}

export interface TaskStatus {
  total: number;
  completed: number;
  pending: number;
  failed: number;
}

export interface RouteIntentStatus {
  intent: RouteIntent;
  fragments: TaskStatus;
}

export interface CreateIntentRequest {
  recipient: string;
  amountSol: number;
  privacyLevel: PrivacyLevel;
  senderPubkey: string;
}

export interface CreateIntentResponse {
  intentId: string;
  xvEntryAddress: string;
}

export interface ConfirmIntentRequest {
  txSignature: string;
}

export interface RegisterNodeRequest {
  nodeId: string;
  capacity: number;
}

export interface HeartbeatRequest {
  nodeId: string;
}

export interface ReportTaskRequest {
  nodeId: string;
  fragmentId: string;
  intentId: string;
  status: "completed" | "failed";
  txSignature?: string;
}

