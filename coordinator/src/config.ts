import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.COORDINATOR_PORT ?? process.env.PORT ?? 4000),
  rpcUrl:
    process.env.XVOID_SOLANA_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    'https://api.mainnet-beta.solana.com',
  redisUrl: process.env.XVOID_REDIS_URL ?? process.env.REDIS_URL ?? null,
  maxRetries: Number(process.env.XVOID_MAX_RETRIES ?? 3)
};

