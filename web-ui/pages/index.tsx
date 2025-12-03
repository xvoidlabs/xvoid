import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Coordinated privacy routing for Solana transfers</h1>
          <p className={styles.heroSubtext}>
            XVoid fragments your SOL transfers across a swarm of nodes using shadow wallets,
            adaptive delays, and optional noise transactions. Break the on-chain link between
            your entry transfer and the recipient&apos;s receipt.
          </p>
          <div className={styles.heroButtons}>
            <button className="btn-primary" onClick={() => router.push('/relay')}>
              Enter Relay
            </button>
            <button className="btn-secondary" onClick={() => router.push('#how-it-works')}>
              How it Works
            </button>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className={styles.capabilities}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Privacy Routing Capabilities</h2>
          <div className={styles.capabilityGrid}>
            <div className="card">
              <h3>Transaction Fragmentation</h3>
              <p>
                Your transfer is split into multiple fragments of varying sizes,
                routed through different nodes at different times.
              </p>
            </div>
            <div className="card">
              <h3>Shadow Wallets</h3>
              <p>
                Intermediate hops use temporary shadow wallets to obscure the
                routing path between entry and exit.
              </p>
            </div>
            <div className="card">
              <h3>Swarm Routing</h3>
              <p>
                Multiple independent nodes execute fragments in parallel,
                distributing trust and reducing correlation risk.
              </p>
            </div>
            <div className="card">
              <h3>Adaptive Delay & Noise</h3>
              <p>
                Configurable delays and optional noise transactions mask timing
                patterns and transaction volumes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className="container">
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>User Signs Entry Transfer</h3>
              <p>
                Connect your wallet and sign a single System Program transfer
                to the XVoid entry wallet. This is your only on-chain signature.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Coordinator Confirms & Plans</h3>
              <p>
                The coordinator verifies your deposit and creates a fragmentation
                plan based on your selected privacy level.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Nodes Execute Fragments</h3>
              <p>
                Swarm nodes execute fragment transfers via shadow wallets with
                configured delays and optional noise transactions.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>Recipient Receives Transfers</h3>
              <p>
                The recipient receives multiple dispersed transfers, breaking
                the on-chain link to your original entry transfer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Ready to Route Privately?</h2>
            <p style={{ marginTop: '16px', marginBottom: '32px' }}>
              Enter the relay console to create your first private route.
            </p>
            <button className="btn-primary" onClick={() => router.push('/relay')}>
              Enter Relay Console
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

