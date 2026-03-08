"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const redact_1 = require("../../server/src/redaction/redact");
describe('Angleton/Harel redaction rules', () => {
    const angleton = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.resolve('server/redaction/rules/angleton.json'), 'utf8'));
    const harel = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.resolve('server/redaction/rules/harel.json'), 'utf8'));
    const sample = {
        email: 'user@example.com',
        phone: '+1-555-867-5309',
        apiKey: 'sk_live_secret',
        notes: 'private incident details',
        context: { address: '10 Downing St', geo: '51.5034,-0.1276' },
    };
    it('angleton masks PII and secrets', async () => {
        const red = await redact_1.redactionService.redactObject(sample, angleton, 't0');
        expect(red.email).not.toContain('@');
        expect(red.phone).toMatch(/\*|\#/);
        expect(red.apiKey).toMatch(/\*|\#/);
    });
    it('harel coarsens geo and hides notes', async () => {
        const red = await redact_1.redactionService.redactObject(sample, harel, 't0');
        expect(typeof red.context.geo).toBe('string');
        expect(red.notes).not.toEqual(sample.notes);
    });
});
