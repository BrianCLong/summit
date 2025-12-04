import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Trash2, Plus, RefreshCw } from 'lucide-react';

const LIST_PERSISTED_QUERIES = gql`
  query ListPersistedQueries($tenantId: String) {
    listPersistedQueries(tenantId: $tenantId) {
      id
      sha256
      query
      createdBy
      createdAt
    }
  }
`;

const UPSERT_PERSISTED_QUERY = gql`
  mutation UpsertPersistedQuery($input: PersistedQueryInput!) {
    upsertPersistedQuery(input: $input)
  }
`;

const DELETE_PERSISTED_QUERY = gql`
  mutation DeletePersistedQuery($id: ID!) {
    deletePersistedQuery(id: $id)
  }
`;

export default function AdminPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuery, setNewQuery] = useState('');
  const [tenantId, setTenantId] = useState('');

  const { data, loading, error, refetch } = useQuery(LIST_PERSISTED_QUERIES, {
    variables: { tenantId: tenantId || null },
    fetchPolicy: 'network-only',
  });

  const [upsertQuery] = useMutation(UPSERT_PERSISTED_QUERY, {
    onCompleted: () => {
      setNewQuery('');
      setShowAddForm(false);
      refetch();
    },
    onError: (err) => alert('Failed to add query: ' + err.message),
  });

  const [deleteQuery] = useMutation(DELETE_PERSISTED_QUERY, {
    onCompleted: () => refetch(),
    onError: (err) => alert('Failed to delete query: ' + err.message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim()) return;
    upsertQuery({
      variables: {
        input: {
          query: newQuery,
          tenantId: tenantId || undefined,
        },
      },
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Persisted Query Administration</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Register Query
        </button>
      </div>

      {showAddForm && (
        <div className="bg-slate-800 p-6 rounded-lg mb-8 border border-slate-700">
          <h2 className="text-lg font-medium mb-4 text-white">Register New Query</h2>
          <form onSubmit={handleAdd}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                GraphQL Query
              </label>
              <textarea
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-md p-3 font-mono text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="query MyQuery { ... }"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Save to Allowlist
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <input
              type="text"
              placeholder="Filter by Tenant ID..."
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button onClick={() => refetch()} title="Refresh list" className="text-slate-500 hover:text-blue-500">
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading queries...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Error loading queries: {error.message}</div>
        ) : data?.listPersistedQueries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p>No persisted queries found.</p>
            <p className="text-sm mt-2">Add one to restrict allowed queries in production.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-medium">
                <th className="p-4 w-24">Hash (Prefix)</th>
                <th className="p-4">Query Snippet</th>
                <th className="p-4 w-32">Created By</th>
                <th className="p-4 w-32">Created At</th>
                <th className="p-4 w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {data.listPersistedQueries.map((q: any) => (
                <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <td className="p-4 font-mono text-xs text-blue-600 dark:text-blue-400">
                    {q.sha256.substring(0, 8)}...
                  </td>
                  <td className="p-4">
                    <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-2 max-h-12 overflow-hidden" title={q.query}>
                      {q.query}
                    </pre>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {q.createdBy || 'System'}
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this query? Clients using it may fail.')) {
                          deleteQuery({ variables: { id: q.id } });
                        }
                      }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete from allowlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
