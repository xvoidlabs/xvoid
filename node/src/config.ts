import dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

const simulateTransfers = parseBoolean(
  process.env.XVOID_SIMULATE_TRANSFERS,
  true
);

export const config = {
  nodeId: process.env.XVOID_NODE_ID ?? 'node-local',
  coordinatorUrl: process.env.XVOID_COORDINATOR_URL ?? 'http://localhost:4000',
  rpcUrl:
    process.env.XVOID_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    'https://api.mainnet-beta.solana.com',
  hotWalletSecret: process.env.XVOID_HOT_WALLET_SECRET_KEY ?? '',
  capacity: Number(process.env.XVOID_NODE_CAPACITY ?? 4),
  endpoint: process.env.XVOID_NODE_ENDPOINT ?? 'http://localhost',
  heartbeatInterval: Number(process.env.XVOID_NODE_HEARTBEAT_MS ?? 15000),
  pollInterval: Number(process.env.XVOID_NODE_POLL_MS ?? 2000),
  requestTimeout: Number(process.env.XVOID_NODE_REQUEST_TIMEOUT ?? 15000),
  simulateTransfers
};

if (!config.hotWalletSecret && !config.simulateTransfers) {
  throw new Error('XVOID_HOT_WALLET_SECRET_KEY is required');
}

