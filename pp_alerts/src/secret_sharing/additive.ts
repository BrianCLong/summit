import * as crypto from 'crypto';

export interface Share {
  index: number;
  value: number; // For simplicity in this toy implementation, using number. Real impl might use BigInt.
  tag: string;
}

export interface ShareBundle {
  shares: Share[];
  modulus: number;
}

export function split(value: number, nShares: number, modulus: number): ShareBundle {
  if (nShares < 2) {
    throw new Error("Need at least 2 shares");
  }
  if (value >= modulus) {
    throw new Error("Value must be less than modulus");
  }

  const shares: Share[] = [];
  let sum = 0;

  for (let i = 0; i < nShares - 1; i++) {
    // Generate random share
    const s = crypto.randomInt(0, modulus);
    shares.push(createShare(i, s));
    sum = (sum + s) % modulus;
  }

  // Calculate last share
  // sum + last = value (mod M) => last = value - sum (mod M)
  let last = (value - sum) % modulus;
  if (last < 0) {
    last += modulus;
  }

  shares.push(createShare(nShares - 1, last));

  return { shares, modulus };
}

function createShare(index: number, value: number): Share {
  const hmacKey = process.env.PP_ALERTS_HMAC_KEY;
  if (!hmacKey) {
    throw new Error("PP_ALERTS_HMAC_KEY environment variable is not set");
  }
  const payload = `${index}:${value}`;
  const tag = crypto.createHmac('sha256', hmacKey).update(payload).digest('hex');
  return { index, value, tag };
}

export function reconstruct(bundle: ShareBundle): number {
  const hmacKey = process.env.PP_ALERTS_HMAC_KEY;
  if (!hmacKey) {
    throw new Error("PP_ALERTS_HMAC_KEY environment variable is not set");
  }
  let sum = 0;
  for (const share of bundle.shares) {
    // Verify tag
    const payload = `${share.index}:${share.value}`;
    const expectedTag = crypto.createHmac('sha256', hmacKey).update(payload).digest('hex');
    if (share.tag !== expectedTag) {
      throw new Error(`Integrity check failed for share ${share.index}`);
    }
    sum = (sum + share.value) % bundle.modulus;
  }
  return sum;
}
