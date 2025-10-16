import React, { useState, useEffect } from 'react';

interface TenantBudget {
  tenant_id: string;
  daily_spent_usd: number;
  daily_limit_usd: number;
  monthly_spent_usd: number;
  monthly_limit_usd: number;
  utilization_daily: number;
  utilization_monthly: number;
  last_updated: string;
  status: 'healthy' | 'approaching' | 'exceeded';
}

interface LedgerEntry {
  id: string;
  tenant_id: string;
  mutation_hash: string;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  timestamp: string;
  operation_type: string;
  status: 'pending' | 'completed' | 'failed';
}

export default function CostExplorer() {
  const [budgets, setBudgets] = useState<TenantBudget[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState<string>('');

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/budget/status');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setBudgets(data.tenants || []);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load budget data',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLedgerData = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
        ...(selectedTenant && { tenant_id: selectedTenant }),
      });

      const response = await fetch(`/api/admin/budget/ledger?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setLedgerEntries(data.entries || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load ledger data',
      );
    }
  };

  const exportCsv = () => {
    const headers = [
      'Tenant',
      'Daily Spent',
      'Daily Limit',
      'Daily %',
      'Monthly Spent',
      'Monthly Limit',
      'Monthly %',
      'Status',
    ];
    const rows = budgets.map((b) => [
      b.tenant_id,
      b.daily_spent_usd.toFixed(2),
      b.daily_limit_usd.toFixed(2),
      (b.utilization_daily * 100).toFixed(1) + '%',
      b.monthly_spent_usd.toFixed(2),
      b.monthly_limit_usd.toFixed(2),
      (b.utilization_monthly * 100).toFixed(1) + '%',
      b.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-status-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadBudgetData();
  }, []);

  useEffect(() => {
    loadLedgerData();
  }, [selectedTenant, dateRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#28a745';
      case 'approaching':
        return '#ffc107';
      case 'exceeded':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getUtilizationBar = (utilization: number) => {
    const percentage = Math.min(utilization * 100, 100);
    const color =
      utilization >= 1 ? '#dc3545' : utilization >= 0.8 ? '#ffc107' : '#28a745';

    return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div
          style={{
            width: '100px',
            height: '20px',
            background: '#e9ecef',
            borderRadius: '10px',
            overflow: 'hidden',
            marginRight: '8px',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: color,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>
          {percentage.toFixed(1)}%
        </span>
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading cost data...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2>Cost Explorer v0</h2>
        <button
          onClick={exportCsv}
          style={{
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Export CSV
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

      <div style={{ marginBottom: 24 }}>
        <h3>Daily Budget Overview</h3>
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
                  Tenant
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Daily Spent
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Daily Limit
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Daily Utilization
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Monthly Spent
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Monthly Limit
                </th>
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: '#6c757d',
                    }}
                  >
                    No budget data available
                  </td>
                </tr>
              ) : (
                budgets.map((budget) => (
                  <tr
                    key={budget.tenant_id}
                    style={{
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor:
                        budget.utilization_daily >= 0.8
                          ? '#fff3cd'
                          : budget.utilization_daily >= 1.0
                            ? '#f8d7da'
                            : 'white',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {budget.tenant_id}
                    </td>
                    <td style={{ padding: '12px' }}>
                      ${budget.daily_spent_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      ${budget.daily_limit_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', minWidth: '150px' }}>
                      {getUtilizationBar(budget.utilization_daily)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      ${budget.monthly_spent_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      ${budget.monthly_limit_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          background: getStatusColor(budget.status),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {budget.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => setSelectedTenant(budget.tenant_id)}
                        style={{
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3>Ledger Entry Drill-Down</h3>
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: 16,
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, marginBottom: 4 }}>
              Tenant Filter
            </span>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <option value="">All Tenants</option>
              {budgets.map((b) => (
                <option key={b.tenant_id} value={b.tenant_id}>
                  {b.tenant_id}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, marginBottom: 4 }}>Start Date</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              style={{
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, marginBottom: 4 }}>End Date</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              style={{
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </label>

          <button
            onClick={loadLedgerData}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

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
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Timestamp
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Tenant
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Operation
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Estimated
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Actual
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Variance
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: '#6c757d',
                    }}
                  >
                    No ledger entries found for selected criteria
                  </td>
                </tr>
              ) : (
                ledgerEntries.slice(0, 100).map((entry) => {
                  const variance =
                    entry.actual_cost_usd - entry.estimated_cost_usd;
                  const variancePercent =
                    entry.estimated_cost_usd > 0
                      ? (variance / entry.estimated_cost_usd) * 100
                      : 0;

                  return (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: '1px solid #dee2e6' }}
                    >
                      <td style={{ padding: '8px', fontSize: '14px' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 500 }}>
                        {entry.tenant_id}
                      </td>
                      <td style={{ padding: '8px', fontSize: '14px' }}>
                        <div
                          title={entry.mutation_hash}
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '120px',
                          }}
                        >
                          {entry.operation_type ||
                            entry.mutation_hash.slice(0, 8)}
                        </div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        ${entry.estimated_cost_usd.toFixed(4)}
                      </td>
                      <td style={{ padding: '8px' }}>
                        ${entry.actual_cost_usd.toFixed(4)}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          color:
                            variance > 0
                              ? '#dc3545'
                              : variance < 0
                                ? '#28a745'
                                : '#6c757d',
                        }}
                      >
                        {variance >= 0 ? '+' : ''}${variance.toFixed(4)}
                        {entry.estimated_cost_usd > 0 && (
                          <span style={{ fontSize: '12px', marginLeft: '4px' }}>
                            ({variancePercent >= 0 ? '+' : ''}
                            {variancePercent.toFixed(1)}%)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            background:
                              entry.status === 'completed'
                                ? '#28a745'
                                : entry.status === 'failed'
                                  ? '#dc3545'
                                  : '#ffc107',
                            color: 'white',
                            padding: '1px 6px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}
                        >
                          {entry.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {ledgerEntries.length > 100 && (
            <div
              style={{
                padding: '12px',
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '14px',
              }}
            >
              Showing first 100 entries of {ledgerEntries.length} total
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
