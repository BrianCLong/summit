// Export shared fixtures from server (if they were in a shared package)
// Since they are not, we might duplicate or symlink.
// For now, I'll create a frontend-specific fixture set matching the server ones.

export const MOCK_GRAPH_DATA = {
  nodes: [
    { id: '1', label: 'Person', name: 'Alice' },
    { id: '2', label: 'Organization', name: 'BobCorp' },
  ],
  links: [{ source: '1', target: '2', type: 'WORKS_FOR' }],
}

export const MOCK_USER = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
}
