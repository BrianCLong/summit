import crypto from 'crypto';
import { MessageEnvelope } from './types.js';

export function signMessage(msg: Omit<MessageEnvelope, 'signature'>, privateKey: string): string {
    const data = `${msg.message_id}:${msg.nonce}:${JSON.stringify(msg.payload)}`;
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
}

export function verifyMessage(msg: MessageEnvelope, publicKey: string): boolean {
    if (!msg.signature) return false;
    const data = `${msg.message_id}:${msg.nonce}:${JSON.stringify(msg.payload)}`;
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, msg.signature, 'hex');
}
