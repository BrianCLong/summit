// Socket.IO event names & payloads (authoritative)
export const RT_NS = {
    COLLAB: '/collab',
};
export const EVT = {
    PRESENCE: 'presence', // user presence & cursors
    NOTE_EDIT: 'note.edit', // rich‑text notes
    GRAPH_MUT: 'graph.mutate', // add/update/delete nodes/edges
    GRAPH_LOCK: 'graph.lock', // optimistic lock hints
    TOAST: 'ui.toast',
};
