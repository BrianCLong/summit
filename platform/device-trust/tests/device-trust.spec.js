"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const posture_fixtures_json_1 = __importDefault(require("../fixtures/posture-fixtures.json"));
const nonCompliant = posture_fixtures_json_1.default[1];
const remediated = { ...nonCompliant, webauthn: { userVerified: true, userPresent: true }, local: { ...nonCompliant.local, firewallEnabled: true, screenLock: true } };
// This scenario is documentation-friendly; running it requires the Go attestor and Node policy service to be up.
(0, test_1.test)('non-compliant → remediate → pass', async ({ request }) => {
    const deviceId = 'playwright-demo';
    const fail = await request.post('http://localhost:8090/evaluate', { data: { deviceId, ...nonCompliant, secureContext: false } });
    (0, test_1.expect)(fail.status()).toBe(200);
    const failBody = await fail.json();
    (0, test_1.expect)(failBody.decision.status).toBe('step_up');
    const pass = await request.post('http://localhost:8090/evaluate', { data: { deviceId, ...remediated, secureContext: true } });
    (0, test_1.expect)(pass.status()).toBe(200);
    const passBody = await pass.json();
    (0, test_1.expect)(passBody.decision.status).toBe('pass');
    (0, test_1.expect)(passBody.decision.claims['posture:status']).toBe('pass');
});
