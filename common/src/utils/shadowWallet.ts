import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export interface ShadowWallet {
  publicKey: string;
  secretKey: Uint8Array;
}

/**
 * Generate a new shadow wallet keypair
 * Shadow wallets are temporary wallets used for intermediate hops
 */
export function generateShadowWallet(): ShadowWallet {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey,
  };
}

/**
 * Convert secret key from base58 string to Uint8Array
 */
export function secretKeyFromBase58(base58: string): Uint8Array {
  return bs58.decode(base58);
}

/**
 * Convert secret key from JSON array to Uint8Array
 */
export function secretKeyFromJson(jsonArray: number[]): Uint8Array {
  return new Uint8Array(jsonArray);
}

/**
 * Convert secret key to base58 string
 */
export function secretKeyToBase58(secretKey: Uint8Array): string {
  return bs58.encode(secretKey);
}

