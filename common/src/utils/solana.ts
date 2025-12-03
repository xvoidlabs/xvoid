import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  Commitment
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount
} from '@solana/spl-token';

export const createConnection = (
  endpoint: string,
  commitment: Commitment = 'confirmed'
): Connection => new Connection(endpoint, { commitment });

export const decodeSecretKey = (secret: string | Uint8Array): Uint8Array => {
  if (secret instanceof Uint8Array) {
    return secret;
  }

  const trimmed = secret.trim();

  if (trimmed.startsWith('[')) {
    return Uint8Array.from(JSON.parse(trimmed));
  }

  return new Uint8Array(Buffer.from(trimmed, 'base64'));
};

export const keypairFromSecret = (secret: string | Uint8Array): Keypair =>
  Keypair.fromSecretKey(decodeSecretKey(secret));

export interface SendSOLParams {
  connection: Connection;
  from: Keypair;
  to: string;
  amountLamports: number;
  skipPreflight?: boolean;
}

export const sendSOL = async ({
  connection,
  from,
  to,
  amountLamports,
  skipPreflight = false
}: SendSOLParams): Promise<string> => {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: new PublicKey(to),
      lamports: amountLamports
    })
  );

  return sendAndConfirmTransaction(connection, transaction, [from], {
    skipPreflight
  });
};

export interface SendSPLParams {
  connection: Connection;
  from: Keypair;
  mint: string;
  to: string;
  amount: bigint | number;
}

export const sendSPL = async ({
  connection,
  from,
  mint,
  to,
  amount
}: SendSPLParams): Promise<string> => {
  const mintKey = new PublicKey(mint);
  const toKey = new PublicKey(to);

  const senderAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    from,
    mintKey,
    from.publicKey
  );

  const recipientAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    from,
    mintKey,
    toKey
  );

  const transaction = new Transaction().add(
    createTransferInstruction(
      senderAccount.address,
      recipientAccount.address,
      from.publicKey,
      typeof amount === 'bigint' ? amount : BigInt(amount)
    )
  );

  return sendAndConfirmTransaction(connection, transaction, [from]);
};

export const getRecentBlockhash = async (
  connection: Connection
): Promise<string> => {
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
};

export const getTPS = async (
  connection: Connection
): Promise<number | null> => {
  const samples = await connection.getRecentPerformanceSamples(5);
  if (!samples.length) {
    return null;
  }

  const totalTransactions = samples.reduce(
    (acc, sample) => acc + sample.numTransactions,
    0
  );
  const totalSeconds = samples.reduce(
    (acc, sample) => acc + sample.samplePeriodSecs,
    0
  );

  if (!totalSeconds) {
    return null;
  }

  return totalTransactions / totalSeconds;
};

