import crypto from 'crypto';
import type { Response } from 'express';

type SerializableBody = string | Buffer;

function toBuffer(body: SerializableBody): Buffer {
  return typeof body === 'string' ? Buffer.from(body) : body;
}

export function applyIntegrityHeaders(res: Response, body: SerializableBody): Buffer {
  const payload = toBuffer(body);
  const digest = crypto.createHash('sha256').update(payload).digest('base64');
  const etag = `W/"${crypto.createHash('sha1').update(payload).digest('hex')}"`;
  res.setHeader('Digest', `sha-256=${digest}`);
  res.setHeader('ETag', etag);
  return payload;
}
