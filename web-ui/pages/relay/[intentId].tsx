import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { XVoidClient } from '@xvoid/sdk';
import { RouteIntentStatus } from '@xvoid/common';
import styles from '../../styles/Status.module.css';

const COORDINATOR_URL = process.env.NEXT_PUBLIC_COORDINATOR_URL || 'http://localhost:3001';

export default function RelayStatus() {
  const router = useRouter();
  const { intentId } = router.query;
  const [status, setStatus] = useState<RouteIntentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!intentId || typeof intentId !== 'string') {
      return;
    }

    const client = new XVoidClient({ baseUrl: COORDINATOR_URL });

    const fetchStatus = async () => {
      try {
        const statusData = await client.getStatus(intentId);
        setStatus(statusData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching status:', err);
        setError(err.message || 'Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, [intentId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="card">
          <div className={styles.loading}>Loading status...</div>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className={styles.container}>
        <div className="card">
          <div className={styles.error}>
            {error || 'Status not found'}
          </div>
        </div>
      </div>
    );
  }

  const { intent, fragments } = status;
  const progress = fragments.total > 0 ? (fragments.completed / fragments.total) * 100 : 0;

  return (
    <div className={styles.container}>
      <div className="card">
        <h2>Route Status</h2>

        <div className={styles.statusSection}>
          <div className={styles.statusBadge} data-status={intent.status}>
            {intent.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Intent ID</label>
            <div className={styles.value}>{intent.id}</div>
          </div>
          <div className={styles.infoItem}>
            <label>Recipient</label>
            <div className={styles.value}>{intent.recipient}</div>
          </div>
          <div className={styles.infoItem}>
            <label>Amount</label>
            <div className={styles.value}>
              {(intent.amountLamports / 1e9).toFixed(9)} SOL
            </div>
          </div>
          <div className={styles.infoItem}>
            <label>Privacy Level</label>
            <div className={styles.value}>{intent.privacyLevel.toUpperCase()}</div>
          </div>
        </div>

        {intent.depositTxSignature && (
          <div className={styles.infoItem}>
            <label>Deposit Transaction</label>
            <div className={styles.value}>
              <a
                href={`https://solscan.io/tx/${intent.depositTxSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {intent.depositTxSignature.slice(0, 8)}...{intent.depositTxSignature.slice(-8)}
              </a>
            </div>
          </div>
        )}

        <div className={styles.progressSection}>
          <h3>Fragment Progress</h3>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.progressStats}>
            <span>Completed: {fragments.completed} / {fragments.total}</span>
            {fragments.pending > 0 && <span>Pending: {fragments.pending}</span>}
            {fragments.failed > 0 && <span className={styles.failed}>Failed: {fragments.failed}</span>}
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={() => router.push('/relay')}
          style={{ marginTop: '32px', width: '100%' }}
        >
          Create New Route
        </button>
      </div>
    </div>
  );
}

