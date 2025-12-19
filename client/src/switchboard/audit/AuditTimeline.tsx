import React, { useEffect, useMemo, useState } from 'react';

type CorrelatedRecord = {
  id: string;
  correlationId: string;
  occurredAt?: string;
  summary?: string;
  receiptUrl?: string;
  policyDecisionUrl?: string;
};

type CorrelatedResponse = {
  records?: CorrelatedRecord[];
};

type AuditTimelineProps = {
  correlationIds: string[];
  fetcher?: typeof fetch;
};

const FALLBACK_SUMMARY = 'No summary available';
const FALLBACK_TIME = 'Time not recorded';

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return FALLBACK_TIME;

  const parsed = new Date(timestamp);

  return Number.isNaN(parsed.getTime())
    ? FALLBACK_TIME
    : parsed.toLocaleString();
}

const AuditTimeline: React.FC<AuditTimelineProps> = ({
  correlationIds,
  fetcher,
}) => {
  const fetchImpl = useMemo(() => fetcher ?? fetch, [fetcher]);
  const [records, setRecords] = useState<CorrelatedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadRecords(ids: string[]) {
      if (!ids.length) {
        setRecords([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const query = encodeURIComponent(ids.join(','));
        const response = await fetchImpl(
          `/api/audit/correlations?ids=${query}`,
        );

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const payload = (await response.json()) as CorrelatedResponse;
        const incoming = Array.isArray(payload.records)
          ? payload.records
          : [];

        if (isActive) {
          setRecords(incoming);
        }
      } catch (err) {
        if (isActive) {
          setError('Unable to load correlated audit records.');
          setRecords([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadRecords(correlationIds);

    return () => {
      isActive = false;
    };
  }, [correlationIds, fetchImpl]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;

      return bTime - aTime;
    });
  }, [records]);

  const hasNoRecords = !loading && !error && sortedRecords.length === 0;

  return (
    <section
      aria-busy={loading}
      aria-live="polite"
      className="audit-timeline"
      data-testid="audit-timeline"
    >
      <header>
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Correlated audit activity
        </p>
        <h3 className="text-lg font-semibold">Audit Timeline</h3>
        {correlationIds.length > 0 ? (
          <p className="text-sm text-gray-500">
            Correlation IDs: {correlationIds.join(', ')}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Provide correlation IDs to retrieve correlated receipts and policy
            decisions.
          </p>
        )}
      </header>

      {loading && <p>Loading correlated activity…</p>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {hasNoRecords && <p>No correlated audit records found.</p>}

      {sortedRecords.length > 0 && (
        <ol className="space-y-4 mt-3">
          {sortedRecords.map((record) => (
            <li
              key={record.id}
              className="border-l-2 border-blue-500 pl-3"
              data-testid={`timeline-entry-${record.id}`}
            >
              <div className="text-xs text-gray-500">
                {formatTimestamp(record.occurredAt)}
              </div>
              <div className="text-sm font-medium">
                {record.summary ?? FALLBACK_SUMMARY}
              </div>
              <div className="flex gap-3 text-sm mt-1">
                {record.receiptUrl ? (
                  <a
                    href={record.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="receipt-link"
                  >
                    View receipt
                  </a>
                ) : (
                  <span data-testid="receipt-unavailable">
                    Receipt unavailable
                  </span>
                )}

                {record.policyDecisionUrl ? (
                  <a
                    href={record.policyDecisionUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="policy-link"
                  >
                    Policy decision
                  </a>
                ) : (
                  <span data-testid="policy-unavailable">
                    Policy decision unavailable
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Correlation ID: {record.correlationId}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default AuditTimeline;
