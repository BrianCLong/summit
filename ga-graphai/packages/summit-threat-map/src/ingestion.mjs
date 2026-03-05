import crypto from 'node:crypto';
import { normalizeShodanEvent, normalizeShadowserverEvent } from './normalizers.mjs';

export function parseShodanStream(payload) {
  return payload
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeShodanEvent(JSON.parse(line)));
}

export function verifyShadowserverHmac(rawBody, signature, secret) {
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!signature || signature.length !== computed.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(signature, 'utf8'));
}

export function parseShadowserverReport(rawBody, reportName) {
  return rawBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeShadowserverEvent(JSON.parse(line), reportName));
}
