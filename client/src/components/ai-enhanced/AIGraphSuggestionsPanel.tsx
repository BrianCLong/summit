import React from 'react';
import { Button, Card, CardContent } from ' @mui/material';

async function gql<T>(query: string, variables?: any) {
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('ig_jwt')}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

export default function AIGraphSuggestionsPanel() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const data = await gql<{ suggestions: any[] }>(
      `query { suggestions { id type label confidence status createdAt } }`,
    );
    setItems(data.suggestions);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, kind: 'accept' | 'reject') => {
    await gql<{ ok: boolean }>(
      `mutation($id: ID!) { ${kind}Suggestion(id:$id) }`,
      { id },
    );
    await load();
  };

  return (
    <div aria-label="AI Suggestions" role="region" className="space-y-3">
      {loading && <div role="status">Loading…</div>}
      {items.map((s) => (
        <Card key={s.id} className="rounded-2xl shadow p-2">
          <CardContent>
            <div className="text-sm opacity-70">
              {s.type} • {s.createdAt}
            </div>
            <div className="text-lg font-medium">{s.label}</div>
            <div className="text-sm">
              confidence: {Math.round(s.confidence * 100)}%
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="small"
                variant="contained"
                onClick={() => act(s.id, 'accept')}
              >
                Accept
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => act(s.id, 'reject')}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {!loading && items.length === 0 && <div>No pending suggestions</div>}
    </div>
  );
}
