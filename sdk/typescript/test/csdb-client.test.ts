import { Buffer } from 'node:buffer';
import nacl from 'tweetnacl';
import {
  CSDBClient,
  ExportManifest,
  buildAttestationPayload,
  canonicalManifest,
  hexToBytes,
  manifestPublicKeyHex,
  verifyManifest,
} from '../src/csdb';

const BASE_URL = 'http://localhost:8080';

function createManifest(): ExportManifest {
  const manifest: ExportManifest = {
    id: 'test-export',
    partnerId: 'partner-alpha',
    generatedAt: '2025-01-14T13:15:00Z',
    filters: {
      purpose: 'marketing',
      jurisdiction: 'US',
      dryRun: false,
    },
    proofAlgorithm: 'sha256(record-json)',
    datasets: [
      {
        name: 'contacts',
        recordCount: 1,
        proofs: [
          {
            recordId: 'rec-001',
            hash: '5c2b28dad4b7ad4c334f278fa85be49c1a1485177112f7a84b92f07a43b2e8e1',
          },
        ],
        transforms: ['email:tokenized-hmac-sha256', 'ssn:redacted'],
      },
    ],
    signature: '',
  };

  const privateKey = hexToBytes(
    'ddf5d1ca75051b0b2ca15940271d2bfbabeb1197eb041311507ed2c16a4603c04221c3a1973b719b5be3f08b0795e84d4a6bf78f11566d10d9dc698c7b80a1cc',
  );
  const message = canonicalManifest(manifest);
  const signature = nacl.sign.detached(message, privateKey);
  manifest.signature = Buffer.from(signature).toString('base64');
  return manifest;
}

describe('CSDB client helpers', () => {
  it('verifies manifest signatures offline', async () => {
    const manifest = createManifest();
    const ok = await verifyManifest(manifest);
    expect(ok).toBe(true);

    const tamperedSig = Buffer.from(manifest.signature, 'base64');
    tamperedSig[0] ^= 0xff;
    manifest.signature = Buffer.from(tamperedSig).toString('base64');
    const tampered = await verifyManifest(manifest);
    expect(tampered).toBe(false);
  });

  it('builds canonical attestation payloads', () => {
    const payload = buildAttestationPayload({
      partnerId: 'partner-alpha',
      statement: 'dataset-received',
      timestamp: '2025-01-15T12:00:00.000Z',
      nonce: 'abc123',
      signature: '',
    });
    expect(payload).toBe('partner-alpha|dataset-received|2025-01-15T12:00:00.000Z|abc123');
  });

  it('constructs a client without altering the base URL', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });
    const client = new CSDBClient(`${BASE_URL}/`, mockFetch as unknown as typeof fetch);
    await client.get('/healthz');
    expect(mockFetch).toHaveBeenCalledWith(`${BASE_URL}/healthz`);
  });

  it('exposes the manifest verification key', () => {
    expect(manifestPublicKeyHex).toBe(
      '4221c3a1973b719b5be3f08b0795e84d4a6bf78f11566d10d9dc698c7b80a1cc',
    );
  });
});
