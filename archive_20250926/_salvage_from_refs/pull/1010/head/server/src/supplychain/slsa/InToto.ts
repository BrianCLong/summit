import crypto from 'crypto';
import { anchorDigest } from '../../transparency/anchor';

export type InTotoSLSA = {
  builder: string;
  materials: string[];
  predicate: { reproducible: true; hermetic: true; pinnedDeps: true };
  digest: string;
};

export function makeProvenance(bundleSha: string): InTotoSLSA {
  return {
    builder: 'ig-hermetic-runner',
    materials: [bundleSha],
    predicate: {
      reproducible: true,
      hermetic: true,
      pinnedDeps: true,
    },
    digest: bundleSha,
  };
}

export async function dualSignProvenance(_prov: InTotoSLSA): Promise<string> {
  // TODO: integrate EC + PQC signatures
  return crypto.createHash('sha256').update(_prov.digest).digest('hex');
}

export async function verifyCosign(_digest: string): Promise<boolean> {
  // Placeholder for cosign verify
  return true;
}

export function submitProvenance(bundleSha: string) {
  const prov = makeProvenance(bundleSha);
  const digest = crypto.createHash('sha256').update(JSON.stringify(prov)).digest('hex');
  anchorDigest(digest, { type: 'slsa', bundleSha });
  return prov;
}
