import { Keypair } from "@solana/web3.js";
import { secretKeyFromBase58, secretKeyFromJson } from "@xvoid/common";

let entryWallet: Keypair | null = null;

/**
 * Get or create the XVoid entry wallet
 * This is the wallet that receives user deposits
 */
export function getEntryWallet(): Keypair {
  if (entryWallet) {
    return entryWallet;
  }

  const secretKeyEnv = process.env.XVOID_ENTRY_WALLET_SECRET_KEY;
  
  if (secretKeyEnv) {
    try {
      // Try parsing as JSON array first
      const jsonArray = JSON.parse(secretKeyEnv);
      if (Array.isArray(jsonArray)) {
        const secretKey = secretKeyFromJson(jsonArray);
        entryWallet = Keypair.fromSecretKey(secretKey);
        return entryWallet;
      }
    } catch {
      // Not JSON, try as base58 string
      try {
        const secretKey = secretKeyFromBase58(secretKeyEnv);
        entryWallet = Keypair.fromSecretKey(secretKey);
        return entryWallet;
      } catch (error) {
        console.error("Failed to parse entry wallet secret key:", error);
      }
    }
  }

  // Generate new wallet if not provided (for development only)
  console.warn("No entry wallet provided, generating new one (development only)");
  entryWallet = Keypair.generate();
  console.log("Generated entry wallet:", entryWallet.publicKey.toBase58());
  
  return entryWallet;
}

