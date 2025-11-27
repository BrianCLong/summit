import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

type DisclosurePack = {
  id: string;
  name: string;
  residency_region: string;
  tenant_id: string;
};

axios.defaults.withCredentials = true;

export default function App() {
  const [packs, setPacks] = useState<DisclosurePack[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showStepUp, setShowStepUp] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [pendingExportId, setPendingExportId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const res = await axios.get('/api/disclosure-packs');
        const list = (res.data?.data as DisclosurePack[]) || [];
        setPacks(list);
        setSelectedId(list[0]?.id ?? null);
        setError(null);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            'Failed to load disclosure packs',
        );
        // provide a small fallback list so the UI remains interactive in dev
        const fallback: DisclosurePack[] = [
          {
            id: 'pack-1',
            name: 'Demo disclosure pack',
            residency_region: 'us',
            tenant_id: 'tenant_demo',
          },
        ];
        setPacks(fallback);
        setSelectedId(fallback[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedId) ?? null,
    [packs, selectedId],
  );

  async function downloadSelected(idOverride?: string) {
    const id = idOverride ?? selectedId;
    if (!id) return;

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
        return;
      }

      alert(
        `Export failed: ${
          data?.reason ?? data?.error ?? e?.message ?? 'unknown error'
        }`,
      );
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Compliance Console</h1>
        <p style={{ color: '#555', marginTop: '0.25rem' }}>
          Manage disclosure packs and perform exports with MFA step-up.
        </p>
      </header>

      {loading ? (
        <p>Loading disclosure packs…</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          <section style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Disclosure packs</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedId(pack.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    border:
                      pack.id === selectedId
                        ? '2px solid #2563eb'
                        : '1px solid #ccc',
                    background: pack.id === selectedId ? '#e0ecff' : '#f8f9fb',
                    cursor: 'pointer',
                    minWidth: 180,
                    textAlign: 'left',
                  }}
                >
                  <strong>{pack.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#555' }}>
                    Region: {pack.residency_region}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#777' }}>
                    Tenant: {pack.tenant_id}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedPack && (
            <section style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Selected pack</h3>
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  padding: '1rem',
                  borderRadius: 8,
                  background: '#fff',
                  maxWidth: 520,
                }}
              >
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>{selectedPack.name}</strong>
                </p>
                <p style={{ margin: '0 0 0.5rem 0', color: '#555' }}>
                  Residency: {selectedPack.residency_region}
                </p>
                <p style={{ margin: '0 0 1rem 0', color: '#555' }}>
                  Tenant: {selectedPack.tenant_id}
                </p>
                <button
                  onClick={() => downloadSelected(selectedPack.id)}
                  style={{
                    padding: '0.65rem 1.1rem',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Download JSON
                </button>
              </div>
            </section>
          )}
        </>
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
                      data?.error ||
                        e?.message ||
                        'Step-up verification failed',
                    );
                  }
                }}
              >
                Verify &amp; Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
