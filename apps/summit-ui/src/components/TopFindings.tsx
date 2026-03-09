import type { Finding } from '../types';
import { SeverityBadge } from './StatusBadge';

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

interface TopFindingsProps {
  findings: Finding[];
}

export function TopFindings({ findings }: TopFindingsProps) {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  if (sorted.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon" aria-hidden="true">✓</span>
        <span className="empty-text">No findings</span>
      </div>
    );
  }

  return (
    <div className="findings-list" role="list" aria-label="Top findings">
      {sorted.map((f, i) => (
        <div
          key={i}
          className={`finding finding-${f.severity}`}
          role="listitem"
          aria-label={`${f.severity}: ${f.message}`}
        >
          <SeverityBadge severity={f.severity} />
          <span className="finding-source">{f.source}</span>
          <span>{f.message}</span>
        </div>
      ))}
    </div>
  );
}
