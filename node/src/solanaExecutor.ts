import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  FragmentTask,
  createConnection,
  keypairFromSecret,
  sendSOL
} from '@xvoid/common';
import { logger } from './logger';

export interface SolanaExecutorOptions {
  rpcUrl: string;
  secretKey?: string;
  simulate: boolean;
}

const MIN_NOISE_LAMPORTS = 5000; // 0.000005 SOL

export class SolanaExecutor {
  private readonly connection: Connection;
  private readonly hotWallet: Keypair;

  constructor(private readonly options: SolanaExecutorOptions) {
    this.connection = createConnection(this.options.rpcUrl);
    this.hotWallet = this.initializeHotWallet();
  }

  private initializeHotWallet(): Keypair {
    if (this.options.simulate && !this.options.secretKey) {
      return Keypair.generate();
    }

    if (!this.options.secretKey) {
      throw new Error('Hot wallet secret key required for live transfers');
    }

    return keypairFromSecret(this.options.secretKey);
  }

  async sendFragment(fragment: FragmentTask): Promise<string> {
    const lamports = this.toLamports(fragment.amount);
    return this.dispatchTransfer(fragment.recipient, lamports);
  }

  async sendNoiseTransfer(destination: string): Promise<string> {
    return this.dispatchTransfer(destination, MIN_NOISE_LAMPORTS, true);
  }

  private async dispatchTransfer(
    recipient: string,
    lamports: number,
    isNoise = false
  ): Promise<string> {
    if (this.options.simulate) {
      const signature = `${isNoise ? 'SIM-NOISE' : 'SIM'}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      logger.debug(
        { recipient, lamports, signature, isNoise },
        'Simulated transfer prepared'
      );
      return signature;
    }

    return sendSOL({
      connection: this.connection,
      from: this.hotWallet,
      to: recipient,
      amountLamports: Math.max(lamports, 1)
    });
  }

  private toLamports(amount: number): number {
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    return Math.max(lamports, MIN_NOISE_LAMPORTS);
  }
}

