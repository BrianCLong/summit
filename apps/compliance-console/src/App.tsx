import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

axios.defaults.withCredentials = true;

interface DisclosurePack {
  id: string;
  name: string;
  residency_region: string;
  tenant_id: string;
}

function App() {
  const [packs, setPacks] = useState<DisclosurePack[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStepUp, setShowStepUp] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [pendingExportId, setPendingExportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get<{ data: DisclosurePack[] }>('/api/disclosure-packs')
      .then((res) => setPacks(res.data.data))
      .catch(() => setPacks([]));
  }, []);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedId) ?? null,
    [packs, selectedId],
  );

  async function downloadSelected(idOverride?: string) {
    const id = idOverride ?? selectedId;
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/disclosure-packs/${id}/export`, {
        responseType: 'blob',
        withCredentials: true,
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disclosure-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      if (status === 403 && data?.reason === 'mfa_required') {
        setPendingExportId(id);
        setShowStepUp(true);
        setStepUpError(null);
        setStepUpCode('');
        setLoading(false);
        return;
      }

      alert(
        `Export failed: ${
          data?.reason ?? data?.error ?? e?.message ?? 'unknown error'
        }`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Compliance Console</h1>
        <p style={{ color: '#555', marginTop: 4 }}>
          Export disclosure packs with step-up verification when required.
        </p>
      </header>

      <section
        style={{
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          padding: '1rem',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Disclosure packs</h2>
        {packs.length === 0 ? (
          <p style={{ color: '#777' }}>No packs available.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '1rem',
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>Region</th>
                <th style={{ padding: '0.5rem' }}>Tenant</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => (
                <tr
                  key={pack.id}
                  onClick={() => setSelectedId(pack.id)}
                  style={{
                    cursor: 'pointer',
                    background:
                      selectedId === pack.id ? 'rgba(59,130,246,0.08)' : 'none',
                  }}
                >
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                    {pack.name}
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                    {pack.residency_region.toUpperCase()}
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                    {pack.tenant_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => downloadSelected(selectedId || undefined)}
            disabled={!selectedPack || loading}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1rem',
              borderRadius: 6,
              opacity: !selectedPack || loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Downloading…' : 'Download JSON'}
          </button>
        </div>
      </section>

      {selectedPack && (
        <section
          style={{
            marginTop: '1rem',
            background: '#fff',
            borderRadius: 8,
            padding: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Selected pack</h3>
          <p style={{ margin: 0 }}>
            <strong>{selectedPack.name}</strong> · Region:{' '}
            {selectedPack.residency_region.toUpperCase()}
          </p>
        </section>
      )}

      {showStepUp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: '1.5rem',
              minWidth: 320,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <h2>Step-up verification required</h2>
            <p style={{ fontSize: '0.9rem', color: '#555' }}>
              To export this disclosure pack, please complete an extra verification
              step. (Dev mode: enter <code>123456</code>.)
            </p>

            <div style={{ margin: '0.75rem 0' }}>
              <input
                type="text"
                placeholder="Verification code"
                value={stepUpCode}
                onChange={(e) => setStepUpCode(e.target.value)}
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </div>

            {stepUpError && (
              <p style={{ color: 'red', fontSize: '0.85rem' }}>{stepUpError}</p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              <button onClick={() => setShowStepUp(false)}>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setStepUpError(null);
                    await axios.post(
                      '/api/auth/step-up',
                      { code: stepUpCode },
                      { withCredentials: true },
                    );
                    setShowStepUp(false);
                    const id = pendingExportId;
                    setPendingExportId(null);
                    if (id) {
                      await downloadSelected(id);
                    }
                  } catch (e: any) {
                    const data = e?.response?.data;
                    setStepUpError(
                      data?.error ?? e?.message ?? 'Step-up verification failed',
                    );
                  }
                }}
              >
                Verify & Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
