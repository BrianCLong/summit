"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceRepo = void 0;
exports.EvidenceRepo = {
    ping: async () => ({ ok: true, version: 'test' }),
    save: async (item) => ({
        ...((typeof item === 'object' && item) || {}),
        id: 'evidence-test',
    }),
    find: async (id) => ({ id, ok: true }),
};
exports.default = exports.EvidenceRepo;
