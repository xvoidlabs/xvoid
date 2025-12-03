import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { TaskStatus } from '@xvoid/common';
import { StatusTracker } from '../../components/StatusTracker';
import { getClient } from '../../lib/client';

const POLL_INTERVAL_MS = 3000;

const StatusPage = () => {
  const router = useRouter();
  const { trackingId } = router.query;
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingId || typeof trackingId !== 'string') {
      return;
    }

    let cancelled = false;
    const client = getClient();

    const fetchStatus = async () => {
      try {
        const data = await client.getStatus(trackingId);
        if (!cancelled) {
          setStatus(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to fetch status'
          );
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trackingId]);

  return (
    <div className="app-shell">
      <Head>
        <title>XVoid Status — {trackingId}</title>
      </Head>
      <main
        style={{
          flex: 1,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          padding: '4rem 1.5rem'
        }}
      >
        <div className="hero">
          <p
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}
          >
            Tracking dashboard
          </p>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '0.25rem' }}>
            Route status
          </h1>
          <p className="helper-text">Tracking ID: {trackingId}</p>
        </div>

        <div className="card">
          {error && (
            <div className="helper-text" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <StatusTracker status={status} />

          <div style={{ marginTop: '2rem' }}>
            <Link href="/" className="link">
              ← Start another transfer
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StatusPage;

