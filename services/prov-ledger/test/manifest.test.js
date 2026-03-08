"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ledger_js_1 = require("../src/lib/ledger.js");
const merkle_js_1 = require("../src/lib/merkle.js");
describe('provenance manifests', () => {
    const base = path_1.default.join(process.cwd(), 'testdata');
    beforeEach(() => {
        // reset singleton ledger by replacing internal maps
        ledger_js_1.ledger.evidenceMap?.clear?.();
        ledger_js_1.ledger.claimMap?.clear?.();
        ledger_js_1.ledger.edges?.splice?.(0);
        ledger_js_1.ledger.log?.splice?.(0);
    });
    it('creates and verifies manifest over three evidence items', () => {
        const files = ['evidence-1.txt', 'evidence-2.txt', 'evidence-3.txt'];
        const evidenceIds = files.map((file) => {
            const content = fs_1.default.readFileSync(path_1.default.join(base, file));
            return ledger_js_1.ledger.addEvidence({ content, mediaType: 'text/plain' }).id;
        });
        const claim = ledger_js_1.ledger.addClaim({ evidenceIds, assertion: { summary: 'alpha+beta->gamma' } });
        const { manifest, serialized } = ledger_js_1.ledger.exportManifest(claim.id);
        const parsed = JSON.parse(serialized);
        const verification = ledger_js_1.ledger.verifyManifest(parsed);
        expect(verification.valid).toBe(true);
        expect(parsed.leaves).toHaveLength(evidenceIds.length + parsed.adjacency.length + 1);
        const recomputedRoot = (0, merkle_js_1.buildMerkleTree)(parsed.leaves).root;
        expect(recomputedRoot).toEqual(parsed.merkleRoot);
    });
    it('flags tampering with pinpointed path', () => {
        const content = fs_1.default.readFileSync(path_1.default.join(base, 'golden-manifest.json'), 'utf-8');
        const manifest = JSON.parse(content);
        manifest.leaves[0].hash = '00badbeef';
        const result = ledger_js_1.ledger.verifyManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.reasons.some((reason) => reason.includes(manifest.leaves[0].id))).toBe(true);
    });
    it('renders lineage adjacency for claim chain', () => {
        const files = ['evidence-1.txt', 'evidence-2.txt'];
        const evidenceIds = files.map((file) => {
            const content = fs_1.default.readFileSync(path_1.default.join(base, file));
            return ledger_js_1.ledger.addEvidence({ content, mediaType: 'text/plain' }).id;
        });
        const claim = ledger_js_1.ledger.addClaim({ evidenceIds, assertion: { statement: 'linked' } });
        const manifest = ledger_js_1.ledger.getManifest(claim.id);
        const adjacency = manifest.adjacency.map((edge) => `${edge.from}->${edge.to}`);
        evidenceIds.forEach((id) => {
            expect(adjacency).toContain(`${id}->${claim.id}`);
        });
    });
});
