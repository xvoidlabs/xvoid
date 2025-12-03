import { Connection } from '@solana/web3.js';
import { createConnection, getTPS } from '@xvoid/common';
import { logger } from './logger';

const CACHE_TTL_MS = 60_000;

export class SolanaMonitor {
  private readonly connection: Connection;
  private lastSample: { value: number | null; timestamp: number } | null = null;

  constructor(rpcUrl: string) {
    this.connection = createConnection(rpcUrl);
  }

  async getTpsHint(): Promise<number | null> {
    const now = Date.now();
    if (this.lastSample && now - this.lastSample.timestamp < CACHE_TTL_MS) {
      return this.lastSample.value;
    }

    try {
      const value = await getTPS(this.connection);
      this.lastSample = { value, timestamp: now };
      return value;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to load TPS hint');
      return null;
    }
  }
}

