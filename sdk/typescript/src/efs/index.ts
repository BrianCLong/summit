import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface SealedFeatureBlob {
  nonce: string;
  ciphertext: string;
}

export interface AttestationQuote {
  tenantId: string;
  featureKey: string;
  nonce: string;
  measurement: string;
  policyHash: string;
  timestamp: string;
  signature: string;
}

export interface AttestationReport {
  quote: AttestationQuote;
  policyHash: string;
}

export interface AttestedFeatureBundle {
  sealedBlob: SealedFeatureBlob;
  report: AttestationReport;
}

export interface GetFeaturesInput {
  tenantId: string;
  featureKey: string;
  nonce: Uint8Array;
  expectedPolicyHash: Uint8Array;
}

export interface EfsClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class EfsClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: EfsClientOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error('No fetch implementation available');
    }
  }

  async getFeatures(input: GetFeaturesInput): Promise<AttestedFeatureBundle> {
    const response = await this.fetchImpl(`${this.options.baseUrl}/features/attested`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantId: input.tenantId,
        featureKey: input.featureKey,
        nonce: encodeBase64(input.nonce),
        expectedPolicyHash: encodeBase64(input.expectedPolicyHash),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`EFS request failed: ${response.status} ${text}`);
    }

    return (await response.json()) as AttestedFeatureBundle;
  }
}

export function verifyAttestationQuote(
  bundle: AttestedFeatureBundle,
  attestationKey: Uint8Array,
): boolean {
  const quote = bundle.report.quote;
  const sealedNonce = decodeBase64(bundle.sealedBlob.nonce);
  const sealedCipher = decodeBase64(bundle.sealedBlob.ciphertext);
  const measurement = computeMeasurement(quote.tenantId, quote.featureKey, sealedNonce, sealedCipher);
  if (!bufferEquals(measurement, decodeBase64(quote.measurement))) {
    return false;
  }
  const message = Buffer.concat([
    Buffer.from(quote.tenantId, 'utf8'),
    Buffer.from(quote.featureKey, 'utf8'),
    decodeBase64(quote.nonce),
    decodeBase64(quote.policyHash),
    measurement,
    Buffer.from(quote.timestamp, 'utf8'),
  ]);
  const expectedSignature = createHmac('sha256', Buffer.from(attestationKey)).update(message).digest();
  return bufferEquals(expectedSignature, decodeBase64(quote.signature));
}

function computeMeasurement(
  tenantId: string,
  featureKey: string,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
): Buffer {
  const hash = createHash('sha256');
  hash.update(Buffer.from(tenantId, 'utf8'));
  hash.update(Buffer.from(featureKey, 'utf8'));
  hash.update(Buffer.from(nonce));
  hash.update(Buffer.from(ciphertext));
  return hash.digest();
}

function encodeBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

function decodeBase64(value: string): Buffer {
  return Buffer.from(value, 'base64');
}

function bufferEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
