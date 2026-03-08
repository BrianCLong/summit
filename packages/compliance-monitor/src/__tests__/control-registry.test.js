"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const control_registry_js_1 = require("../control-registry.js");
const sampleYaml = `
- id: control.access.sso
  title: Enforce SSO and MFA
  category: security
  objective: Require SSO and MFA for privileged systems
  owner:
    primary: security@example.com
    backup: it@example.com
  check:
    type: automated
    script: scripts/check-sso.sh
  schedule:
    frequencyMinutes: 60
    toleranceMinutes: 30
  rtoMinutes: 240
  evidence:
    path: ./artifacts
    retentionDays: 90
    ttlDays: 14
    signer: security-bot
  tags:
    - soc2
    - access
`;
describe('ControlRegistry', () => {
    it('validates and normalizes YAML definitions', async () => {
        const dir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'registry-'));
        const filePath = path_1.default.join(dir, 'controls.yaml');
        await promises_1.default.writeFile(filePath, sampleYaml);
        const registry = await control_registry_js_1.ControlRegistry.fromYaml(filePath);
        const control = registry.get('control.access.sso');
        expect(control).toBeDefined();
        expect(control?.evidence.path.startsWith(dir)).toBe(true);
    });
    it('rejects invalid owner emails', async () => {
        const dir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'registry-'));
        const filePath = path_1.default.join(dir, 'controls.yaml');
        await promises_1.default.writeFile(filePath, sampleYaml.replace('security@example.com', 'not-an-email'));
        await expect(control_registry_js_1.ControlRegistry.fromYaml(filePath)).rejects.toThrow('Invalid email');
    });
});
