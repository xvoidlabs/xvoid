import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/router';
import { XVoidClient } from '@xvoid/sdk';
import { PrivacyLevel } from '@xvoid/common';
import styles from '../../styles/Relay.module.css';

const COORDINATOR_URL = process.env.NEXT_PUBLIC_COORDINATOR_URL || 'http://localhost:3001';

export default function RelayConsole() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const [recipient, setRecipient] = useState('');
  const [amountSol, setAmountSol] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    if (!recipient || !amountSol) {
      setError('Please fill in all fields');
      return;
    }

    const amount = parseFloat(amountSol);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const client = new XVoidClient({ baseUrl: COORDINATOR_URL });

      // Create intent
      const { intentId, xvEntryAddress } = await client.createIntent({
        recipient,
        amountSol: amount,
        privacyLevel,
        senderPubkey: publicKey.toBase58(),
      });

      // Create and sign transfer transaction
      const amountLamports = Math.floor(amount * 1e9);
      const entryPubkey = new PublicKey(xvEntryAddress);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: entryPubkey,
          lamports: amountLamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Confirm intent
      await client.confirmIntent(intentId, signature);

      // Navigate to status page
      router.push(`/relay/${intentId}`);
    } catch (err: any) {
      console.error('Error creating route:', err);
      setError(err.message || 'Failed to create route');
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className={styles.container}>
        <div className={styles.connectCard}>
          <h2>Connect Your Wallet</h2>
          <p>Please connect your Solana wallet to use the relay console.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.relayCard}>
        <h2>Create Private Route</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="recipient">Recipient Address</label>
            <input
              id="recipient"
              type="text"
              className="input"
              placeholder="Enter Solana address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="amount">Amount (SOL)</label>
            <input
              id="amount"
              type="number"
              step="0.000000001"
              className="input"
              placeholder="0.0"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="privacy">Privacy Level</label>
            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={`${styles.segment} ${privacyLevel === 'low' ? styles.segmentActive : ''}`}
                onClick={() => setPrivacyLevel('low')}
                disabled={loading}
              >
                Low
              </button>
              <button
                type="button"
                className={`${styles.segment} ${privacyLevel === 'medium' ? styles.segmentActive : ''}`}
                onClick={() => setPrivacyLevel('medium')}
                disabled={loading}
              >
                Medium
              </button>
              <button
                type="button"
                className={`${styles.segment} ${privacyLevel === 'high' ? styles.segmentActive : ''}`}
                onClick={() => setPrivacyLevel('high')}
                disabled={loading}
              >
                High
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '24px' }}
          >
            {loading ? 'Creating Route...' : 'Create Private Route'}
          </button>
        </form>
      </div>
    </div>
  );
}

