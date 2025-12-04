import React, { useEffect, useState } from 'react';
import axios from 'axios';

type DisclosurePackListItem = {
  id: string;
  tenant_id: string;
  product: string;
  environment: string;
  build_id: string;
  generated_at: string;
  vuln_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
};

type EnvironmentFilter = 'all' | 'dev' | 'stage' | 'prod';

export const App: React.FC = () => {
  const [items, setItems] = useState<DisclosurePackListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedJson, setSelectedJson] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [envFilter, setEnvFilter] = useState<EnvironmentFilter>('all');

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const params =
        envFilter === 'all' ? {} : { environment: envFilter as string };
      const res = await axios.get('/api/disclosure-packs', { params });
      setItems(res.data.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envFilter]);

  async function openPack(id: string) {
    setSelectedId(id);
    setSelectedJson(null);
    setDownloadError(null);
    try {
      const res = await axios.get(`/api/disclosure-packs/${id}`);
      setSelectedJson(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      setSelectedJson(`Error: ${e?.message ?? 'Failed to load pack'}`);
    }
  }

  async function downloadSelected() {
    if (!selectedId) return;
    setDownloadError(null);
    try {
      const res = await axios.get(`/api/disclosure-packs/${selectedId}/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disclosure-${selectedId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setDownloadError(e?.message ?? 'Failed to export pack');
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem' }}>
      <h1>Compliance Console – Disclosure Packs</h1>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <label>
          Environment:&nbsp;
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value as EnvironmentFilter)}
          >
            <option value="all">All</option>
            <option value="dev">Dev</option>
            <option value="stage">Stage</option>
            <option value="prod">Prod</option>
          </select>
        </label>
        <button onClick={fetchList} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '1rem',
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              Generated At
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              Product
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              Env
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              Build
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              CVEs (C/H/M/L)
            </th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td style={{ padding: '0.25rem 0' }}>
                {new Date(i.generated_at).toLocaleString()}
              </td>
              <td>{i.product}</td>
              <td>{i.environment}</td>
              <td>{i.build_id.slice(0, 7)}</td>
              <td>
                {i.vuln_summary.critical}/{i.vuln_summary.high}/
                {i.vuln_summary.medium}/{i.vuln_summary.low}
              </td>
              <td>
                <button onClick={() => openPack(i.id)}>View JSON</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && (
            <tr>
              <td colSpan={6} style={{ padding: '0.5rem', color: '#666' }}>
                No disclosure packs found for this tenant/environment.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedId && (
        <div>
          <h2>Disclosure Pack: {selectedId}</h2>
          <div style={{ marginBottom: '0.5rem' }}>
            <button onClick={downloadSelected}>
              Download JSON
            </button>
            {downloadError && (
              <span style={{ color: 'red', marginLeft: '0.75rem' }}>
                {downloadError}
              </span>
            )}
          </div>
          <pre
            style={{
              maxHeight: '350px',
              overflow: 'auto',
              background: '#f5f5f5',
              borderRadius: '4px',
              padding: '0.75rem',
              fontSize: '0.85rem',
            }}
          >
            {selectedJson ?? 'Loading…'}
          </pre>
        </div>
      )}
    </div>
  );
};
