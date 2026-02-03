import { randomBytes } from 'crypto';

export function generateEvidenceId(prefix: string = 'EVD-OPS'): string {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}
