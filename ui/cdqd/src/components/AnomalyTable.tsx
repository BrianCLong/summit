import type { Anomaly } from '../types';

interface Props {
  anomalies: Anomaly[];
  onSelectTarget?: (target: string) => void;
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

export default function AnomalyTable({ anomalies, onSelectTarget }: Props) {
  if (anomalies.length === 0) {
    return <p>No anomalies detected yet. Stream new data or register rules to begin monitoring.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Target</th>
            <th>Entity</th>
            <th>Reason</th>
            <th>Value</th>
            <th>Expected</th>
            <th>Explanations</th>
          </tr>
        </thead>
        <tbody>
          {anomalies.map((anomaly) => (
            <tr
              key={anomaly.id}
              onClick={() => onSelectTarget?.(anomaly.target)}
              style={{ cursor: onSelectTarget ? 'pointer' : 'default' }}
            >
              <td>{formatDate(anomaly.timestamp)}</td>
              <td>{anomaly.target}</td>
              <td>{anomaly.entity ?? '—'}</td>
              <td>{anomaly.type === 'metric' ? anomaly.metric : anomaly.ruleDescription ?? anomaly.ruleId}</td>
              <td>{anomaly.value !== undefined ? anomaly.value.toFixed(2) : '—'}</td>
              <td>{anomaly.expected !== undefined ? anomaly.expected.toFixed(2) : '—'}</td>
              <td>
                <div className="tag-list">
                  {anomaly.explanations.map((exp, idx) => (
                    <span key={idx} className="tag">
                      {exp.algorithm} · score {exp.score.toFixed(2)}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

