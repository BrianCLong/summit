import { createHmac } from 'node:crypto';

export class SigningService {
  constructor(private readonly secret: string) {
    if (!secret) {
      throw new Error('Signing secret must be provided');
    }
  }

  sign(payload: Record<string, unknown>): string {
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    return createHmac('sha256', this.secret).update(normalized).digest('base64url');
  }
}
