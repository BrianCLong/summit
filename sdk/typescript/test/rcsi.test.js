"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const proof_1 = require("../src/rcsi/proof");
function loadSnapshot() {
    const file = node_path_1.default.resolve(__dirname, '..', '..', '..', 'services', 'rcsi', 'internal', 'index', 'testdata', 'index_snapshot.json');
    return JSON.parse(node_fs_1.default.readFileSync(file, 'utf8'));
}
describe('RCSI snapshot compatibility', () => {
    const snapshot = loadSnapshot();
    it('validates document proofs against the snapshot', () => {
        const tombstone = snapshot.documentTombstones.find((ts) => ts.documentId === 'doc-003');
        expect(tombstone).toBeDefined();
        if (!tombstone) {
            return;
        }
        const proof = {
            kind: 'document',
            documentId: tombstone.documentId,
            query: tombstone.documentId,
            tombstone,
            version: snapshot.version,
        };
        expect(() => (0, proof_1.validateProof)(proof, snapshot)).not.toThrow();
        expect((0, proof_1.digestFor)('document', tombstone.term, tombstone.documentId, tombstone.sequence, tombstone.timestamp, tombstone.reason, tombstone.version)).toEqual(tombstone.digest);
    });
    it('validates term proofs against the snapshot', () => {
        const group = snapshot.termTombstones.find((entry) => entry.term === 'erasure');
        expect(group).toBeDefined();
        if (!group) {
            return;
        }
        const tombstone = group.tombstones[0];
        const proof = {
            kind: 'term',
            term: group.term,
            documentId: tombstone.documentId,
            query: `${group.term}#${tombstone.documentId}`,
            tombstone,
            version: snapshot.version,
        };
        expect(() => (0, proof_1.validateProof)(proof, snapshot)).not.toThrow();
    });
    it('rejects tampered proofs', () => {
        const tombstone = snapshot.documentTombstones[0];
        const proof = {
            kind: 'document',
            documentId: 'doc-001',
            query: 'doc-001',
            tombstone,
            version: snapshot.version,
        };
        expect(() => (0, proof_1.validateProof)(proof, snapshot)).toThrow();
    });
});
