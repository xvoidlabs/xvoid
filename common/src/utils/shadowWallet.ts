import { Keypair } from '@solana/web3.js';

export interface ShadowWallet {
  publicKey: string;
  secretKey: Uint8Array;
}

export const generateShadowWallet = (): ShadowWallet => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey
  };
};

