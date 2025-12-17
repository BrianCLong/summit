
// Helper for legacy support, but for now we export a fetcher that mimics the old 'api' style
// or we fix the call sites.
// The old 'api' was likely `export async function api(path: string) { ... }`

export async function fetchFromApi(path: string, token: string = '', tenant: string = 't1', caseId: string = 'c1') {
  const headers: any = {
    'X-Tenant-ID': tenant,
    'X-Case-ID': caseId,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Try to get token if not provided (client-side only)
  if (!token && typeof window !== 'undefined') {
      // In a real app we'd get this from a context or storage
  }

  const res = await fetch(`http://localhost:8000${path}`, { headers });
  if (!res.ok) {
     throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// Re-export old style api for compatibility if needed, but better to fix call sites.
// For the server component, we need a way to get token.
// For MVP, we will hardcode a dev token fetch or use a default.

export async function api(path: string) {
    // This is used by server components.
    // We can fetch a dev token.
    const tokenRes = await fetch('http://localhost:8000/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub: 'analyst1',
          roles: ['analyst'],
          clearances: ['analyst'],
          cases: ['c1'],
        }),
      });
      const tokenData = await tokenRes.json();
      const token = tokenData.access_token;

      return fetchFromApi(path, token);
}


export interface Entity {
  id: string;
  type: string;
  name: string;
  policy?: any;
}

export interface GraphData {
  nodes: any[];
  edges: any[];
}

export async function searchEntities(
  query: string,
  token: string,
  tenant: string,
  caseId: string
): Promise<Entity[]> {
  const res = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenant,
      'X-Case-ID': caseId,
    },
  });
  if (!res.ok) {
    console.error('Search failed', res.status);
    return [];
  }
  return res.json();
}

export async function getNeighbors(
  nodeId: string,
  token: string,
  tenant: string,
  caseId: string
): Promise<GraphData> {
  const res = await fetch(`http://localhost:8000/entities/${nodeId}/neighbors`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenant,
      'X-Case-ID': caseId,
    },
  });
  if (!res.ok) {
    console.error('Neighbors failed', res.status);
    return { nodes: [], edges: [] };
  }
  return res.json();
}

export async function getAuthToken(): Promise<string> {
  const res = await fetch('http://localhost:8000/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sub: 'analyst1',
      roles: ['analyst'],
      clearances: ['analyst'],
      cases: ['c1'],
    }),
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.access_token;
}
