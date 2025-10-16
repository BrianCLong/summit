import { useMemo, useState } from 'react';

type Operation = 'export' | 'rectify' | 'delete';

type ProofSummary = {
  connector: string;
  hash: string;
  type: 'rectification' | 'deletion';
};

type RequestStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface DsarReviewRecord {
  id: string;
  subjectId: string;
  tenantId: string;
  operation: Operation;
  status: RequestStatus;
  submittedAt: string;
  replayAvailable: boolean;
  exportLocation?: string;
  proofs?: ProofSummary[];
}

export interface DsarReviewerProps {
  requests: DsarReviewRecord[];
  onReplay?: (requestId: string) => Promise<void> | void;
  onInspect?: (request: DsarReviewRecord) => void;
}

const statusLabel: Record<RequestStatus, string> = {
  pending: 'Pending approval',
  'in-progress': 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

const OperationBadge = ({ operation }: { operation: Operation }) => {
  const color =
    operation === 'export'
      ? '#2563eb'
      : operation === 'rectify'
        ? '#047857'
        : '#dc2626';
  return (
    <span
      style={{
        background: `${color}14`,
        border: `1px solid ${color}33`,
        color,
        borderRadius: '999px',
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
      }}
    >
      {operation}
    </span>
  );
};

const ProofList = ({ proofs }: { proofs: ProofSummary[] }) => {
  if (!proofs.length) {
    return (
      <p style={{ margin: 0, fontStyle: 'italic' }}>No proofs attached.</p>
    );
  }
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
      {proofs.map((proof) => (
        <li
          key={`${proof.type}-${proof.connector}-${proof.hash}`}
          style={{ marginBottom: 4 }}
        >
          <strong>{proof.connector}</strong> — {proof.type} proof{' '}
          <code>{proof.hash.slice(0, 8)}…</code>
        </li>
      ))}
    </ul>
  );
};

export const DsarReviewer = ({
  requests,
  onReplay,
  onInspect,
}: DsarReviewerProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      ),
    [requests],
  );

  const activeRequest = useMemo(
    () => sortedRequests.find((request) => request.id === activeId) ?? null,
    [sortedRequests, activeId],
  );

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 50%' }}>
        <h2 style={{ marginTop: 0 }}>DSAR Review Queue</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                Subject
              </th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Tenant</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                Operation
              </th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                Submitted
              </th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRequests.map((request) => {
              const isActive = activeId === request.id;
              return (
                <tr
                  key={request.id}
                  style={{
                    background: isActive ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                  onClick={() => {
                    setActiveId(request.id);
                    onInspect?.(request);
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>{request.subjectId}</td>
                  <td style={{ padding: '8px 12px' }}>{request.tenantId}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <OperationBadge operation={request.operation} />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {statusLabel[request.status]}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {new Date(request.submittedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {request.replayAvailable && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onReplay?.(request.id);
                        }}
                        style={{
                          background: '#111827',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '6px 12px',
                          cursor: 'pointer',
                        }}
                        aria-label={`Replay DSAR request ${request.id}`}
                      >
                        Replay
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <aside
        style={{
          flex: '1 1 50%',
          borderLeft: '1px solid #e5e7eb',
          paddingLeft: 24,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Request details</h3>
        {activeRequest ? (
          <div>
            <p style={{ margin: '4px 0' }}>
              <strong>Request ID:</strong> {activeRequest.id}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Subject:</strong> {activeRequest.subjectId}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Tenant:</strong> {activeRequest.tenantId}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Status:</strong> {statusLabel[activeRequest.status]}
            </p>
            {activeRequest.exportLocation && (
              <p style={{ margin: '4px 0' }}>
                <strong>Export pack:</strong>{' '}
                <code>{activeRequest.exportLocation}</code>
              </p>
            )}
            {activeRequest.proofs && activeRequest.proofs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ margin: '0 0 8px' }}>Proofs</h4>
                <ProofList proofs={activeRequest.proofs} />
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontStyle: 'italic' }}>
            Select a request to inspect its fulfillment artifacts.
          </p>
        )}
      </aside>
    </div>
  );
};

export default DsarReviewer;
