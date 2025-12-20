import crypto from 'crypto';

export function calculateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function signData(data: string): string {
  // In a real implementation, this would use a private key or KMS/Cosign
  // For now, we simulate a signature with HMAC
  const secret = process.env.SIGNING_SECRET || 'dev-secret';
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export interface Provenance {
  templateId: string;
  version: string;
  generatedAt: string;
  inputHash: string;
  outputHash: string;
  signature: string;
}

export function generateProvenance(
  templateId: string,
  version: string,
  inputData: any,
  outputBuffer: Buffer
): Provenance {
  const inputHash = crypto.createHash('sha256').update(JSON.stringify(inputData)).digest('hex');
  const outputHash = calculateHash(outputBuffer);

  const provenanceData = `${templateId}:${version}:${inputHash}:${outputHash}`;
  const signature = signData(provenanceData);

  return {
    templateId,
    version,
    generatedAt: new Date().toISOString(),
    inputHash,
    outputHash,
    signature,
  };
}
