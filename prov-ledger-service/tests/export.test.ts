import { generateKeyPairSync } from 'crypto';
import { ExecutionReceipt, signReceipt } from '@intelgraph/provenance';
import { generateExportBundle } from '../src/export/bundle';

const baseReceipt: ExecutionReceipt = {
  id: 'receipt-1',
  createdAt: new Date().toISOString(),
  executionId: 'exec-1',
  hashes: {
    inputs: [{ name: 'input-a', hash: 'aaa', redactable: true }],
    outputs: [{ name: 'output-a', hash: 'bbb' }],
    manifest: 'manifest',
  },
  signer: { keyId: 'local', algorithm: 'ed25519' },
  signature: '',
};

describe('generateExportBundle', () => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const signed = signReceipt(
    baseReceipt,
    privateKey.export({ format: 'pem', type: 'pkcs8' }),
  );

  it('constructs bundle with disclosure metadata', () => {
    const bundle = generateExportBundle({
      receipt: signed,
      artifacts: { 'input-a': Buffer.from('input'), 'output-a': Buffer.from('out') },
      redactions: ['input-a'],
      reason: 'PII',
    });

    expect(bundle.receipt.disclosure?.redactions).toContain('input-a');
    const redactedEntry = bundle.manifest.artifacts.find((a) => a.name === 'input-a');
    expect(redactedEntry?.redacted).toBe(true);
    expect(bundle.artifacts['input-a']).toBeUndefined();
  });
});
