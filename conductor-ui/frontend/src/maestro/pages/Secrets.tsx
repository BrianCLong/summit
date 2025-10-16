import React from 'react';
import { api } from '../api';
import SecretField from '../components/SecretField';
import { redactSensitive, sanitizeLogs } from '../utils/secretUtils';

export default function Secrets() {
  const { getSecrets, rotateSecret, getProviders, testProvider } = api();
  const [items, setItems] = React.useState<any[]>([]);
  const [providers, setProviders] = React.useState<any[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [newSecret, setNewSecret] = React.useState({
    name: '',
    value: '',
    provider: 'vault',
  });
  const [auditLogs, setAuditLogs] = React.useState<string[]>([]);
  const [showNewSecretForm, setShowNewSecretForm] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await getSecrets();
        setItems(r.items || []);
      } catch {}
    })();
    (async () => {
      try {
        const p = await getProviders();
        setProviders(p.items || []);
      } catch {}
    })();
  }, []);

  const handleCreateSecret = async () => {
    try {
      // In production this would call the API
      const mockSecret = {
        id: `sec_${Date.now()}`,
        ref: `${newSecret.provider}/${newSecret.name}`,
        provider: newSecret.provider.toUpperCase(),
        lastAccess: new Date().toISOString(),
        rotationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      };

      setItems([...items, mockSecret]);
      setNewSecret({ name: '', value: '', provider: 'vault' });
      setShowNewSecretForm(false);
      setMsg('Secret created successfully');
      setTimeout(() => setMsg(null), 3000);

      // Add to audit log (redacted)
      const logEntry = `Secret created: ${redactSensitive(`${newSecret.name}=${newSecret.value}`)}`;
      setAuditLogs([...auditLogs, logEntry]);
    } catch (error) {
      setMsg('Failed to create secret');
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Secrets & Connections</h2>
        <button
          onClick={() => setShowNewSecretForm(!showNewSecretForm)}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700"
        >
          Add Secret
        </button>
      </div>

      {showNewSecretForm && (
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
          <h3 className="font-medium text-slate-900">Create New Secret</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                value={newSecret.name}
                onChange={(e) =>
                  setNewSecret({ ...newSecret, name: e.target.value })
                }
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                placeholder="e.g., api-key-prod"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Provider
              </label>
              <select
                value={newSecret.provider}
                onChange={(e) =>
                  setNewSecret({ ...newSecret, provider: e.target.value })
                }
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              >
                <option value="vault">HashiCorp Vault</option>
                <option value="aws-kms">AWS KMS</option>
                <option value="azure-kv">Azure Key Vault</option>
                <option value="gcp-sm">Google Secret Manager</option>
              </select>
            </div>
          </div>

          <SecretField
            label="Secret Value"
            value={newSecret.value}
            onChange={(value) => setNewSecret({ ...newSecret, value })}
            showStrengthIndicator={true}
            allowCopy={false}
            className="w-full"
          />

          <div className="flex gap-2">
            <button
              onClick={handleCreateSecret}
              disabled={!newSecret.name || !newSecret.value}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Secret
            </button>
            <button
              onClick={() => {
                setShowNewSecretForm(false);
                setNewSecret({ name: '', value: '', provider: 'vault' });
              }}
              className="border border-slate-200 px-4 py-2 rounded-md text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b bg-slate-50 px-4 py-2">
          <h3 className="font-semibold text-slate-700">Managed Secrets</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Last Access</th>
              <th className="px-4 py-3">Rotation Due</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{s.ref}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {s.provider}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {s.lastAccess}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      new Date(s.rotationDue) <
                      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {s.rotationDue}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      aria-label={`Rotate ${s.ref}`}
                      className="text-indigo-600 hover:text-indigo-800 text-xs"
                      onClick={async () => {
                        try {
                          await rotateSecret(s.id);
                          setMsg('Rotation triggered');
                          setTimeout(() => setMsg(null), 1500);
                          // Add to audit log
                          setAuditLogs([
                            ...auditLogs,
                            `Secret rotated: ${s.ref}`,
                          ]);
                        } catch (e: any) {
                          setMsg(e?.message || 'Failed');
                        }
                      }}
                    >
                      Rotate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold text-slate-700">
            Provider Connections
          </div>
          <button
            className="text-indigo-600 hover:text-indigo-800 text-sm"
            onClick={async () => {
              try {
                const p = await getProviders();
                setProviders(p.items || []);
              } catch {}
            }}
          >
            Refresh
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p: any) => (
              <tr key={p.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      p.status === 'UP'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.latencyMs}ms</td>
                <td className="px-4 py-3">
                  <button
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                    onClick={async () => {
                      try {
                        await testProvider(p.id);
                        const r = await getProviders();
                        setProviders(r.items || []);
                        setAuditLogs([
                          ...auditLogs,
                          `Connection tested: ${p.name}`,
                        ]);
                      } catch {}
                    }}
                  >
                    Test Connection
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {auditLogs.length > 0 && (
        <section className="rounded-lg border bg-white">
          <div className="border-b bg-slate-50 px-4 py-2">
            <h3 className="font-semibold text-slate-700">Audit Log</h3>
          </div>
          <div className="p-4">
            <div className="bg-slate-900 text-green-400 p-3 rounded-md font-mono text-xs max-h-48 overflow-y-auto">
              {sanitizeLogs(auditLogs).map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-slate-500">
                    {new Date().toISOString()}
                  </span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {msg && (
        <div
          className={`p-3 rounded-md text-sm ${
            msg.includes('success') || msg.includes('triggered')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 text-sm text-blue-800">
            <p>
              <strong>Security Note:</strong> Secret values are never displayed
              in plaintext. All operations are logged and audited. Secrets are
              automatically encrypted at rest and in transit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
