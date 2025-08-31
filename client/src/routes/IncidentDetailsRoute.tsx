import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import ExportAuditBundleButton from '../components/ExportAuditBundleButton';
import ProvenanceFilterPanel from '../components/ProvenanceFilterPanel';

const PROV_Q = gql`
  query ProvByIncident($id: ID!, $filter: ProvenanceFilter, $first: Int, $offset: Int) {
    provenanceByIncident(incidentId: $id, filter: $filter, first: $first, offset: $offset) {
      id
      kind
      createdAt
      metadata
    }
  }
`;

export default function IncidentDetailsRoute() {
  const { incidentId = '' } = useParams();
  const [filter, setFilter] = useState<{ reasonCodeIn?: string[]; from?: string; to?: string } | undefined>(undefined);
  const [groupBy, setGroupBy] = useState<'none' | 'minute' | 'hour'>('none');
  const variables = useMemo(() => ({ id: incidentId, filter, first: 50, offset: 0 }), [incidentId, filter]);
  const { data, loading, error, refetch } = useQuery(PROV_Q, { variables, fetchPolicy: 'cache-and-network', skip: !incidentId });

  const events = data?.provenanceByIncident ?? [];
  const groups = useMemo(() => {
    if (!events || groupBy === 'none') return null;
    const fmt = (iso: string) => {
      const d = new Date(iso);
      if (groupBy === 'hour') return d.toISOString().slice(0, 13);
      return d.toISOString().slice(0, 16);
    };
    const m = new Map<string, any[]>();
    for (const e of events) {
      const k = fmt(e.createdAt || e.created_at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [events, groupBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Incident {incidentId}</h2>
        <ExportAuditBundleButton incidentId={incidentId} />
      </div>
      <ProvenanceFilterPanel
        onApply={(f) => { setFilter(f); refetch({ ...variables, filter: f }); }}
        initial={filter}
        scope="incident"
        id={incidentId}
      />
      <div className="flex items-center gap-2 text-sm">
        <label className="opacity-70">Group by:</label>
        <select className="border p-1" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
          <option value="none">None</option>
          <option value="minute">Minute</option>
          <option value="hour">Hour</option>
        </select>
      </div>
      {loading && <div>Loading provenance…</div>}
      {error && <div className="text-red-600">Error loading provenance</div>}
      {!loading && !error && (
        <div>
          <div className="text-sm opacity-70 mb-2">{events.length} event(s)</div>
          {groupBy === 'none' ? (
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
                {events.map((e: any) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="p-2">{e.kind}</td>
                    <td className="p-2">{e.metadata?.reasonCode || '-'}</td>
                    <td className="p-2"><MetadataPreview metadata={e.metadata} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-4">
              {groups!.map(([bucket, items]) => (
                <div key={bucket} className="border rounded">
                  <div className="px-3 py-2 text-xs bg-gray-50 border-b">{bucket.replace('T', ' ')} ({items.length})</div>
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
                          <td className="p-2">{new Date(e.createdAt).toLocaleTimeString()}</td>
                          <td className="p-2">{e.kind}</td>
                          <td className="p-2">{e.metadata?.reasonCode || '-'}</td>
                          <td className="p-2"><MetadataPreview metadata={e.metadata} /></td>
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
    </div>
  );
}

function MetadataPreview({ metadata }: { metadata: any }) {
  const [open, setOpen] = useState(false);
  if (!metadata) return <span className="opacity-50">-</span>;
  return (
    <span className="relative inline-block">
      <button className="text-blue-600 underline" onClick={() => setOpen((v) => !v)} title="Preview metadata">View</button>
      {open && (
        <div className="absolute z-10 mt-1 w-[320px] max-h-[240px] overflow-auto border rounded bg-white shadow p-2 text-xs">
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(metadata, null, 2)}</pre>
        </div>
      )}
    </span>
  );
}
