import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import ExportAuditBundleButton from '../components/ExportAuditBundleButton';
import ProvenanceFilterPanel from '../components/ProvenanceFilterPanel';
import VirtualizedListTable from '../components/common/VirtualizedListTable';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { PerfMarkOverlay, usePerfMarkers } from '../hooks/usePerfMarkers';

const PROV_Q = gql`
  query ProvByIncident(
    $id: ID!
    $filter: ProvenanceFilter
    $first: Int
    $offset: Int
  ) {
    provenanceByIncident(
      incidentId: $id
      filter: $filter
      first: $first
      offset: $offset
    ) {
      id
      kind
      createdAt
      metadata
    }
  }
`;

export default function IncidentDetailsRoute() {
  const { incidentId = '' } = useParams();
  const [filter, setFilter] = useState<
    { reasonCodeIn?: string[]; from?: string; to?: string } | undefined
  >(undefined);
  const [groupBy, setGroupBy] = useState<'none' | 'minute' | 'hour'>('none');
  const [search, setSearch] = useState('');
  const variables = useMemo(
    () => ({ id: incidentId, filter, first: 50, offset: 0 }),
    [incidentId, filter],
  );
  const { data, loading, error, refetch } = useQuery(PROV_Q, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !incidentId,
  });

  const virtualized =
    useFeatureFlag('ui.virtualLists') ||
    useFeatureFlag('ui.virtualLists.incidents');
  const { mark, overlayState } = usePerfMarkers('incident-events', virtualized);
  const debouncedSearch = useDebouncedValue(search, 150);
  const events = data?.provenanceByIncident ?? [];

  const filteredEvents = useMemo(() => {
    if (!debouncedSearch) return events;
    const term = debouncedSearch.toLowerCase();
    return events.filter((e: any) => {
      const meta = JSON.stringify(e.metadata ?? {}).toLowerCase();
      return (
        e.kind?.toLowerCase().includes(term) ||
        (e.metadata?.reasonCode || '').toLowerCase().includes(term) ||
        meta.includes(term)
      );
    });
  }, [debouncedSearch, events]);

  const groups = useMemo(() => {
    if (!filteredEvents || groupBy === 'none') return null;
    const fmt = (iso: string) => {
      const d = new Date(iso);
      if (groupBy === 'hour') return d.toISOString().slice(0, 13);
      return d.toISOString().slice(0, 16);
    };
    const m = new Map<string, any[]>();
    for (const e of filteredEvents) {
      const k = fmt(e.createdAt || e.created_at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filteredEvents, groupBy]);

  useEffect(() => {
    const done = mark('rows');
    return done;
  }, [filteredEvents, mark, groupBy]);

  const columns = useMemo(
    () => [
      {
        key: 'time',
        label: 'Time',
        width: '1.4fr',
        render: (e: any) => new Date(e.createdAt).toLocaleString(),
      },
      { key: 'kind', label: 'Kind', width: '1fr', render: (e: any) => e.kind },
      {
        key: 'reason',
        label: 'ReasonCode',
        width: '1fr',
        render: (e: any) => e.metadata?.reasonCode || '-',
      },
      {
        key: 'meta',
        label: 'Metadata',
        width: '2fr',
        render: (e: any) => <MetadataPreview metadata={e.metadata} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Incident {incidentId}</h2>
        <ExportAuditBundleButton incidentId={incidentId} />
      </div>
      <ProvenanceFilterPanel
        onApply={(f) => {
          setFilter(f);
          refetch({ ...variables, filter: f });
        }}
        initial={filter}
        scope="incident"
        id={incidentId}
      />
      <div className="flex items-center gap-2 text-sm">
        <label className="opacity-70">Group by:</label>
        <select
          className="border p-1"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as any)}
        >
          <option value="none">None</option>
          <option value="minute">Minute</option>
          <option value="hour">Hour</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm opacity-70" htmlFor="incident-filter">
          Filter rows
        </label>
        <input
          id="incident-filter"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-2 py-1 text-sm rounded"
          placeholder="Search kind, reason code, or metadata"
        />
      </div>
      {loading && <div>Loading provenance…</div>}
      {error && <div className="text-red-600">Error loading provenance</div>}
      {!loading && !error && (
        <div>
          <div className="text-sm opacity-70 mb-2">
            {filteredEvents.length} event(s)
          </div>
          {groupBy === 'none' ? (
            <VirtualizedListTable
              ariaLabel="Incident provenance events"
              items={filteredEvents}
              columns={columns}
              height={Math.min(
                640,
                Math.max(240, filteredEvents.length * 56),
              )}
              rowHeight={56}
              virtualizationEnabled={virtualized}
              getRowId={(e: any) => e.id}
              emptyMessage="No provenance events"
            />
          ) : (
            <div className="space-y-4">
              {groups!.map(([bucket, items]) => (
                <div key={bucket} className="border rounded">
                  <div className="px-3 py-2 text-xs bg-gray-50 border-b">
                    {bucket.replace('T', ' ')} ({items.length})
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="p-2">Time</th>
                        <th className="p-2">Kind</th>
                        <th className="p-2">ReasonCode</th>
                        <th className="p-2">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((e: any) => (
                        <tr key={e.id} className="border-b">
                          <td className="p-2">
                            {new Date(e.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="p-2">{e.kind}</td>
                          <td className="p-2">
                            {e.metadata?.reasonCode || '-'}
                          </td>
                          <td className="p-2">
                            <MetadataPreview metadata={e.metadata} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <PerfMarkOverlay
        label="Incident events"
        state={overlayState}
        show={import.meta.env.DEV && virtualized}
      />
    </div>
  );
}

function MetadataPreview({ metadata }: { metadata: any }) {
  const [open, setOpen] = useState(false);
  if (!metadata) return <span className="opacity-50">-</span>;
  return (
    <span className="relative inline-block">
      <button
        className="text-blue-600 underline"
        onClick={() => setOpen((v) => !v)}
        title="Preview metadata"
      >
        View
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-[320px] max-h-[240px] overflow-auto border rounded bg-white shadow p-2 text-xs">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </span>
  );
}
