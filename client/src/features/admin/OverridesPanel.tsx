import React, { useState, useEffect } from 'react';

interface Override {
  id: string;
  tenant_id: string;
  reason: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  override_type: 'budget_increase' | 'approval_bypass' | 'pq_bypass';
  config: any;
  status: 'active' | 'expired' | 'revoked';
  approvers?: string[];
}

interface CreateOverrideRequest {
  tenant_id: string;
  reason: string;
  override_type: 'budget_increase' | 'approval_bypass' | 'pq_bypass';
  duration_hours: number;
  config: any;
  dual_approval?: boolean;
}

export default function OverridesPanel() {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [newOverride, setNewOverride] = useState<CreateOverrideRequest>({
    tenant_id: '',
    reason: '',
    override_type: 'budget_increase',
    duration_hours: 24,
    config: {},
    dual_approval: false,
  });

  const loadOverrides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/overrides');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setOverrides(data.overrides || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overrides');
    } finally {
      setLoading(false);
    }
  };

  const createOverride = async () => {
    if (!newOverride.tenant_id || !newOverride.reason) {
      setError('Tenant ID and reason are required');
      return;
    }

    try {
      setCreateLoading(true);
      const response = await fetch('/api/admin/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOverride),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setNewOverride({
        tenant_id: '',
        reason: '',
        override_type: 'budget_increase',
        duration_hours: 24,
        config: {},
        dual_approval: false,
      });
      setShowCreateForm(false);
      await loadOverrides();
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create override',
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const revokeOverride = async (overrideId: string) => {
    try {
      const response = await fetch(`/api/admin/overrides/${overrideId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await loadOverrides();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to revoke override',
      );
    }
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors = {
      active: '#28a745',
      expired: '#6c757d',
      revoked: '#dc3545',
    };
    return (
      <span
        style={{
          background: colors[status as keyof typeof colors] || '#6c757d',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  const formatDuration = (createdAt: string, expiresAt: string) => {
    const duration = Math.round(
      (new Date(expiresAt).getTime() - new Date(createdAt).getTime()) /
        (1000 * 60 * 60),
    );
    return `${duration}h`;
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading overrides...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2>Budget & Policy Overrides</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showCreateForm ? 'Cancel' : 'Create Override'}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {showCreateForm && (
        <div
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3>Create New Override</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, marginBottom: 4 }}>
                Tenant ID *
              </span>
              <input
                value={newOverride.tenant_id}
                onChange={(e) =>
                  setNewOverride({ ...newOverride, tenant_id: e.target.value })
                }
                placeholder="demo, test, etc."
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, marginBottom: 4 }}>
                Override Type
              </span>
              <select
                value={newOverride.override_type}
                onChange={(e) =>
                  setNewOverride({
                    ...newOverride,
                    override_type: e.target.value as any,
                  })
                }
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              >
                <option value="budget_increase">Budget Increase</option>
                <option value="approval_bypass">Approval Bypass</option>
                <option value="pq_bypass">Persisted Query Bypass</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, marginBottom: 4 }}>
                Duration (hours)
              </span>
              <input
                type="number"
                min="1"
                max="24"
                value={newOverride.duration_hours}
                onChange={(e) =>
                  setNewOverride({
                    ...newOverride,
                    duration_hours: Number(e.target.value),
                  })
                }
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, marginBottom: 4 }}>
                Dual Approval
              </span>
              <label
                style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}
              >
                <input
                  type="checkbox"
                  checked={newOverride.dual_approval}
                  onChange={(e) =>
                    setNewOverride({
                      ...newOverride,
                      dual_approval: e.target.checked,
                    })
                  }
                  style={{ marginRight: 8 }}
                />
                Require second approver
              </label>
            </label>
          </div>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 600, marginBottom: 4 }}>Reason *</span>
            <textarea
              value={newOverride.reason}
              onChange={(e) =>
                setNewOverride({ ...newOverride, reason: e.target.value })
              }
              placeholder="Explain why this override is needed..."
              rows={3}
              style={{
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                resize: 'vertical',
              }}
            />
          </label>

          {newOverride.override_type === 'budget_increase' && (
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: 16,
              }}
            >
              <span style={{ fontWeight: 600, marginBottom: 4 }}>
                Multiplier
              </span>
              <input
                type="number"
                min="1.1"
                max="10"
                step="0.1"
                value={newOverride.config.multiplier || 2.0}
                onChange={(e) =>
                  setNewOverride({
                    ...newOverride,
                    config: {
                      ...newOverride.config,
                      multiplier: Number(e.target.value),
                    },
                  })
                }
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </label>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={createOverride}
              disabled={createLoading}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: createLoading ? 'not-allowed' : 'pointer',
                opacity: createLoading ? 0.7 : 1,
              }}
            >
              {createLoading ? 'Creating...' : 'Create Override'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #dee2e6',
          }}
        >
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Tenant
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Type
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Duration
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Reason
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Created By
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Expires
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {overrides.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#6c757d',
                  }}
                >
                  No overrides found
                </td>
              </tr>
            ) : (
              overrides.map((override) => (
                <tr
                  key={override.id}
                  style={{ borderBottom: '1px solid #dee2e6' }}
                >
                  <td style={{ padding: '12px' }}>
                    {getStatusBadge(override.status)}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>
                    {override.tenant_id}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {override.override_type.replace('_', ' ').toUpperCase()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatDuration(override.created_at, override.expires_at)}
                  </td>
                  <td style={{ padding: '12px', maxWidth: '200px' }}>
                    <div
                      title={override.reason}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {override.reason}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>{override.created_by}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {new Date(override.expires_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {override.status === 'active' && (
                      <button
                        onClick={() => revokeOverride(override.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
