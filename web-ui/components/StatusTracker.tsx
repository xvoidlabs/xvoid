import { TaskStatus } from '@xvoid/common';

interface StatusTrackerProps {
  status: TaskStatus | null;
}

const metricClasses: Record<string, string> = {
  completed: 'var(--success)',
  pending: 'var(--accent)',
  failed: 'var(--danger)'
};

export const StatusTracker = ({ status }: StatusTrackerProps) => {
  if (!status) {
    return (
      <div className="status-pill">
        <strong>Waiting</strong>
        <small>Tracking route progress…</small>
      </div>
    );
  }

  return (
    <div className="status-grid">
      <div className="status-pill">
        <strong>{status.totalFragments}</strong>
        <small>Total fragments</small>
      </div>
      {(['completed', 'pending', 'failed'] as const).map((key) => (
        <div
          key={key}
          className="status-pill"
          style={{ borderColor: `${metricClasses[key]}33` }}
        >
          <strong style={{ color: metricClasses[key] }}>
            {status[key]}
          </strong>
          <small>{key}</small>
        </div>
      ))}
    </div>
  );
};

