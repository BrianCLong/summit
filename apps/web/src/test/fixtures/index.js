"use strict";
// Export shared fixtures from server (if they were in a shared package)
// Since they are not, we might duplicate or symlink.
// For now, I'll create a frontend-specific fixture set matching the server ones.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_USER = exports.MOCK_GRAPH_DATA = void 0;
exports.MOCK_GRAPH_DATA = {
    nodes: [
        { id: '1', label: 'Person', name: 'Alice' },
        { id: '2', label: 'Organization', name: 'BobCorp' },
    ],
    links: [{ source: '1', target: '2', type: 'WORKS_FOR' }],
};
exports.MOCK_USER = {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
};
