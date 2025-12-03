import { useState } from 'react';
import { PrivacyLevel } from '@xvoid/common';
import { getClient } from '../lib/client';

interface TransferFormProps {
  onResult: (trackingId: string) => void;
}

const privacyOptions: { label: string; value: PrivacyLevel; description: string }[] = [
  {
    label: 'Low',
    value: 'low',
    description: '2 fragments, minimal delays, fastest delivery'
  },
  {
    label: 'Medium',
    value: 'medium',
    description: '4 fragments, balanced cover traffic'
  },
  {
    label: 'High',
    value: 'high',
    description: '6 fragments, maximum obfuscation'
  }
];

export const TransferForm = ({ onResult }: TransferFormProps) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const numericAmount = Number(amount);
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Enter a valid amount greater than 0');
      }

      const client = getClient();
      const { trackingId } = await client.send({
        recipient,
        amount: numericAmount,
        privacy
      });
      onResult(trackingId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit transfer'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="grid" onSubmit={onSubmit}>
      <div className="input-group">
        <label htmlFor="recipient">Recipient Wallet</label>
        <input
          id="recipient"
          className="input"
          placeholder="Destination public key"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          required
          minLength={32}
        />
      </div>

      <div className="input-group">
        <label htmlFor="amount">Amount (SOL)</label>
        <input
          id="amount"
          type="number"
          step="0.000001"
          min="0"
          className="input"
          placeholder="1.25"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="input-group">
        <label htmlFor="privacy">Privacy Level</label>
        <select
          id="privacy"
          className="select"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
        >
          {privacyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} — {option.description}
            </option>
          ))}
        </select>
        <span className="helper-text">
          Higher privacy routes send more fragments with wider delays and cover
          traffic.
        </span>
      </div>

      {error && (
        <div className="helper-text" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Planning route…' : 'Start Private Transfer'}
      </button>
    </form>
  );
};

