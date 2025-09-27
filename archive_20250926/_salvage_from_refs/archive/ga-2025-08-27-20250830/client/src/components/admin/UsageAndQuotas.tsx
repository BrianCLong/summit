import React from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import $ from 'jquery';

// GraphQL Queries and Mutations
const GET_USAGE_DATA = gql`
  query GetUsageData($tenantId: ID!, $w: String!) {
    tenantPlan(tenantId: $tenantId) {
      planId
      overrides
    }
    usageSummary(tenantId: $tenantId, window: $w) {
      feature
      total
    }
  }
`;

const SIMULATE_INVOICE_MUTATION = gql`
  mutation SimulateInvoice($tenantId: ID!, $s: DateTime!, $e: DateTime!) {
    simulateInvoice(tenantId: $tenantId, start: $s, end: $e) {
      items {
        feature
        total
      }
      estimate
      currency
    }
  }
`;

declare global {
  interface Window {
    __apollo: any; // To access Apollo Client directly for jQuery wiring
  }
}

/**
 * React component for displaying Usage & Quotas for a tenant.
 * Allows tenant admins to view their plan, usage, and simulate invoices.
 */
export const UsageAndQuotas: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, loading, error, refetch } = useQuery(GET_USAGE_DATA, {
    variables: { tenantId, w: '30d' }, // Default to last 30 days usage
  });
  const [simulateInvoice, { loading: simulatingInvoice }] = useMutation(SIMULATE_INVOICE_MUTATION);

  // jQuery wiring for the simulate invoice button
  React.useEffect(() => {
    const btnInvoice = $('#btnInvoice');
    const invoiceOut = $('#invoiceOut');

    const handleClick = async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); // Start of current month
      const end = now.toISOString(); // Current date

      try {
        // Use window.__apollo to access the Apollo Client instance for mutations
        const res = await window.__apollo.mutate({
          mutation: SIMULATE_INVOICE_MUTATION,
          variables: { tenantId, s: start, e: end },
        });
        invoiceOut.text(JSON.stringify(res.data.simulateInvoice, null, 2));
      } catch (e: any) {
        invoiceOut.text(`Error: ${e.message}`);
        console.error('Error simulating invoice:', e);
      }
    };

    btnInvoice.on('click', handleClick);

    // Cleanup
    return () => {
      btnInvoice.off('click', handleClick);
    };
  }, [tenantId]); // Re-run effect if tenantId changes

  if (loading) return <p>Loading usage data...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const tenantPlan = data?.tenantPlan;
  const usageSummary = data?.usageSummary;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Usage & Quotas for Tenant: {tenantId}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Details Card */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Current Plan</h3>
          <div className="mb-2 font-semibold">Plan: {tenantPlan?.planId || 'N/A'}</div>
          {tenantPlan?.overrides && Object.keys(tenantPlan.overrides).length > 0 && (
            <div className="text-sm text-gray-600">
              <p className="font-medium">Overrides:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs">{JSON.stringify(tenantPlan.overrides, null, 2)}</pre>
            </div>
          )}
          <button className="mt-4 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Upgrade Plan</button>
        </div>

        {/* Usage Summary Card */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Usage Summary (Last 30 Days)</h3>
          <ul className="list-disc list-inside text-gray-600">
            {usageSummary?.length > 0 ? (
              usageSummary.map((u: any) => (
                <li key={u.feature} className="text-sm">
                  <span className="font-semibold">{u.feature}</span>: {u.total}
                </li>
              ))
            ) : (
              <p>No usage recorded for the last 30 days.</p>
            )}
          </ul>
        </div>
      </div>

      {/* Invoice Simulation Card */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold text-lg text-gray-700 mb-2">Invoice Simulation</h3>
        <p className="text-gray-600 mb-3">Simulate an invoice for the current month based on your usage.</p>
        <button id="btnInvoice" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400">
          {simulatingInvoice ? 'Simulating...' : 'Simulate Current Month Invoice'}
        </button>
        <pre id="invoiceOut" className="mt-4 bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60"></pre>
      </div>
    </div>
  );
};
