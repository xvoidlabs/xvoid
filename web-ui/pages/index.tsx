import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { TransferForm } from '../components/TransferForm';

const HomePage = () => {
  const [trackingId, setTrackingId] = useState<string | null>(null);

  return (
    <div className="app-shell">
      <Head>
        <title>XVoid Privacy Relay</title>
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
            AI-Assisted Privacy Relay
          </p>
          <h1 style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>
            XVoid Transaction Sharder
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Submit a Solana transfer and the coordinator will split, delay, and
            reroute fragments through anonymous swarm nodes.
          </p>
        </div>

        <div className="card">
          <TransferForm onResult={setTrackingId} />
        </div>

        {trackingId && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3>Tracking ID</h3>
            <p className="helper-text">
              Monitor fragment progress in real time.
            </p>
            <code
              style={{
                display: 'inline-block',
                margin: '1rem 0',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: 'var(--surface-accent)'
              }}
            >
              {trackingId}
            </code>
            <div>
              <Link href={`/status/${trackingId}`} className="button">
                View Status Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;

