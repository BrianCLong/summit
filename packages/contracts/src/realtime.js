"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVT = exports.RT_NS = void 0;
// Socket.IO event names & payloads (authoritative)
exports.RT_NS = {
    COLLAB: '/collab',
};
exports.EVT = {
    PRESENCE: 'presence', // user presence & cursors
    NOTE_EDIT: 'note.edit', // rich‑text notes
    GRAPH_MUT: 'graph.mutate', // add/update/delete nodes/edges
    GRAPH_LOCK: 'graph.lock', // optimistic lock hints
    TOAST: 'ui.toast',
};
