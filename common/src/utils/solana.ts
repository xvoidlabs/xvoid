import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";

/**
 * Create and send a SOL transfer using System Program
 */
export async function createAndSendSOLTransfer(
  connection: Connection,
  fromKeypair: Keypair,
  toPubkey: string | PublicKey,
  amountLamports: number
): Promise<string> {
  const toPublicKey = typeof toPubkey === "string" ? new PublicKey(toPubkey) : toPubkey;
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: amountLamports,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromKeypair],
    {
      commitment: "confirmed",
    }
  );

  return signature;
}

/**
 * Get a confirmed transaction by signature
 */
export async function getConfirmedTransaction(
  connection: Connection,
  signature: string
): Promise<ParsedTransactionWithMeta | null> {
  return await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
  });
}

/**
 * Verify a transfer transaction
 * Returns true if the transaction sends the expected amount from sender to recipient
 */
export async function verifyTransferTransaction(
  connection: Connection,
  signature: string,
  expectedSender: string,
  expectedRecipient: string,
  expectedAmountLamports: number,
  toleranceLamports: number = 1000 // Default 1000 lamports tolerance
): Promise<boolean> {
  try {
    const tx = await getConfirmedTransaction(connection, signature);
    
    if (!tx || !tx.meta) {
      return false;
    }

    if (tx.meta.err) {
      return false;
    }

    const senderPubkey = new PublicKey(expectedSender);
    const recipientPubkey = new PublicKey(expectedRecipient);

    // Check if transaction contains a transfer instruction
    if (!tx.transaction.message.instructions) {
      return false;
    }

    let foundTransfer = false;
    let actualAmount = 0;

    for (const instruction of tx.transaction.message.instructions) {
      if ("programId" in instruction) {
        const programId = instruction.programId;
        
        // Check if it's a System Program transfer
        if (programId.equals(SystemProgram.programId)) {
          if ("parsed" in instruction && instruction.parsed) {
            const parsed = instruction.parsed;
            
            if (parsed.type === "transfer") {
              const info = parsed.info;
              
              if (
                info.source === expectedSender &&
                info.destination === expectedRecipient
              ) {
                foundTransfer = true;
                actualAmount = parseInt(info.lamports);
                break;
              }
            }
          }
        }
      }
    }

    if (!foundTransfer) {
      return false;
    }

    // Check amount within tolerance
    const difference = Math.abs(actualAmount - expectedAmountLamports);
    return difference <= toleranceLamports;
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return false;
  }
}

/**
 * Get balance of a wallet
 */
export async function getBalance(
  connection: Connection,
  pubkey: string | PublicKey
): Promise<number> {
  const publicKey = typeof pubkey === "string" ? new PublicKey(pubkey) : pubkey;
  return await connection.getBalance(publicKey, "confirmed");
}

/**
 * Generate a random Solana address (for noise transactions)
 */
export function generateRandomAddress(): string {
  const keypair = Keypair.generate();
  return keypair.publicKey.toBase58();
}

