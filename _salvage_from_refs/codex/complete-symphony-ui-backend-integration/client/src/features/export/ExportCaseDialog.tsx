import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { EXPORT_CASE } from '../../graphql/export.gql.js';

interface Props {
  caseId: string;
  open: boolean;
  onClose: () => void;
}

export function ExportCaseDialog({ caseId, open, onClose }: Props) {
  const [exportCase, { loading, error }] = useMutation(EXPORT_CASE);
  const [manifest, setManifest] = useState<any | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const { data } = await exportCase({ variables: { caseId } });
      const out = data?.exportCase;
      setManifest(out?.manifest ?? null);
      setZipUrl(out?.zipUrl ?? null);
      setBlockReason(out?.blockReason ?? null);
    } catch (e) {
      // handled by error state
    }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)' }}>
      <div style={{ maxWidth: 720, margin: '10% auto', background: 'white', padding: 16, borderRadius: 8 }}>
        <h3>Export Case Bundle</h3>
        <p>Case: {caseId}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} disabled={loading}>Export</button>
          <button onClick={onClose}>Close</button>
        </div>
        {error ? <p style={{ color: 'crimson' }}>Error: {(error as any)?.message}</p> : null}
        {blockReason ? (
          <div style={{ marginTop: 12, padding: 8, background: '#fff6f6', border: '1px solid #f0caca' }}>
            <strong>Blocked by Policy:</strong>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{blockReason}</pre>
            <small>Contact the dataset owner or follow the appeal path documented in policy.</small>
          </div>
        ) : null}
        {manifest ? (
          <div style={{ marginTop: 12 }}>
            <h4>Manifest</h4>
            {manifest.root ? (
              <p>
                Root: <code>{manifest.root}</code>
                <button
                  style={{ marginLeft: 8 }}
                  onClick={() => navigator.clipboard?.writeText(manifest.root)}
                >
                  Copy
                </button>
              </p>
            ) : null}
            {Array.isArray(manifest.entries) ? (
              <details open>
                <summary>{manifest.entries.length} entries</summary>
                <ul>
                  {manifest.entries.map((e: any, i: number) => (
                    <li key={i}>
                      <code>{e.path || e.id}</code> — <small>{e.hash}</small>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {zipUrl ? (
              <p>
                <a href={zipUrl} rel="noreferrer noopener" target="_blank">Download bundle</a>
              </p>
            ) : (
              <small>Note: a downloadable bundle URL may be populated by a background worker in a later step.</small>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

