"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const granite_client_1 = require("../src/granite-client");
// Ensure heuristic mode
delete process.env.GRANITE_DOCLING_ENDPOINT;
describe('GraniteDoclingClient heuristics', () => {
    const client = new granite_client_1.GraniteDoclingClient();
    it('synthesizes fragments when no endpoint configured', async () => {
        const log = fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures/sample-build-log.txt'), 'utf8');
        const response = await client.parse({
            requestId: 'heuristic-1',
            tenantId: 'tenant-h',
            purpose: 'investigation',
            retention: 'short',
            contentType: 'text/plain',
            bytes: Buffer.from(log).toString('base64'),
        });
        expect(response.result.fragments.length).toBeGreaterThan(0);
        expect(response.usage.characters).toBeGreaterThan(0);
    });
    it('creates focused failure summary', async () => {
        const log = fs_1.default.readFileSync(path_1.default.join(__dirname, 'fixtures/sample-build-log.txt'), 'utf8');
        const response = await client.summarize({
            requestId: 'heuristic-2',
            tenantId: 'tenant-h',
            purpose: 'investigation',
            retention: 'short',
            text: log,
            focus: 'failures',
        });
        expect(response.result.text).toContain('Failure summary');
        expect(response.result.highlights.length).toBeGreaterThan(0);
    });
});
