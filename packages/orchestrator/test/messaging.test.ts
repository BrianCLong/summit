import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { signMessage, verifyMessage } from '../src/messages/verify_signature.js';
import { InboxView } from '../src/messages/inbox_view.js';
import { MessageEnvelope } from '../src/messages/types.js';

describe('Messaging', () => {
    it('should sign and verify messages', () => {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });

        const msg: any = {
            message_id: '1',
            nonce: '123',
            payload: { hello: 'world' }
        };

        const signature = signMessage(msg, privateKey.export({ type: 'pkcs1', format: 'pem' }) as string);
        msg.signature = signature;

        const isValid = verifyMessage(msg, publicKey.export({ type: 'spki', format: 'pem' }) as string);
        expect(isValid).toBe(true);

        // Tamper
        msg.nonce = '124';
        const isValid2 = verifyMessage(msg, publicKey.export({ type: 'spki', format: 'pem' }) as string);
        expect(isValid2).toBe(false);
    });

    it('should route messages correctly', () => {
        const inbox = new InboxView();
        const msg1: MessageEnvelope = {
            message_id: '1', team_id: 't', from_agent_id: 'a', to: 'b', type: 'text', payload: {}, created_at: '2025-01-01T10:00:00Z'
        };
        const msg2: MessageEnvelope = {
            message_id: '2', team_id: 't', from_agent_id: 'a', to: 'broadcast', type: 'text', payload: {}, created_at: '2025-01-01T11:00:00Z'
        };

        inbox.addMessage(msg1);
        inbox.addMessage(msg2);

        const msgsB = inbox.getMessages('b');
        expect(msgsB).toHaveLength(2);
        expect(msgsB.map(m => m.message_id)).toEqual(['1', '2']); // 1 then 2 (sorted by time)

        const msgsC = inbox.getMessages('c');
        expect(msgsC).toHaveLength(1); // Only broadcast
        expect(msgsC[0].message_id).toBe('2');
    });
});
