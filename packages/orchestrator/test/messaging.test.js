"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto_1 = __importDefault(require("crypto"));
const verify_signature_js_1 = require("../src/messages/verify_signature.js");
const inbox_view_js_1 = require("../src/messages/inbox_view.js");
(0, vitest_1.describe)('Messaging', () => {
    (0, vitest_1.it)('should sign and verify messages', () => {
        const { privateKey, publicKey } = crypto_1.default.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        const msg = {
            message_id: '1',
            nonce: '123',
            payload: { hello: 'world' }
        };
        const signature = (0, verify_signature_js_1.signMessage)(msg, privateKey.export({ type: 'pkcs1', format: 'pem' }));
        msg.signature = signature;
        const isValid = (0, verify_signature_js_1.verifyMessage)(msg, publicKey.export({ type: 'spki', format: 'pem' }));
        (0, vitest_1.expect)(isValid).toBe(true);
        // Tamper
        msg.nonce = '124';
        const isValid2 = (0, verify_signature_js_1.verifyMessage)(msg, publicKey.export({ type: 'spki', format: 'pem' }));
        (0, vitest_1.expect)(isValid2).toBe(false);
    });
    (0, vitest_1.it)('should route messages correctly', () => {
        const inbox = new inbox_view_js_1.InboxView();
        const msg1 = {
            message_id: '1', team_id: 't', from_agent_id: 'a', to: 'b', type: 'text', payload: {}, created_at: '2025-01-01T10:00:00Z'
        };
        const msg2 = {
            message_id: '2', team_id: 't', from_agent_id: 'a', to: 'broadcast', type: 'text', payload: {}, created_at: '2025-01-01T11:00:00Z'
        };
        inbox.addMessage(msg1);
        inbox.addMessage(msg2);
        const msgsB = inbox.getMessages('b');
        (0, vitest_1.expect)(msgsB).toHaveLength(2);
        (0, vitest_1.expect)(msgsB.map(m => m.message_id)).toEqual(['1', '2']); // 1 then 2 (sorted by time)
        const msgsC = inbox.getMessages('c');
        (0, vitest_1.expect)(msgsC).toHaveLength(1); // Only broadcast
        (0, vitest_1.expect)(msgsC[0].message_id).toBe('2');
    });
});
