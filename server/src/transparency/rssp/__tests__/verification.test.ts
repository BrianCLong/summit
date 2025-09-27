import { RSSP_ATTESTATIONS } from '../attestations.js';
import { materializeExport, verifyAttestation } from '../verification.js';

describe('RSSP verification suite', () => {
  it('verifies every attestation in the dataset', () => {
    for (const attestation of RSSP_ATTESTATIONS) {
      const result = verifyAttestation(attestation);
      expect(result.ok).toBe(true);
      expect(result.checklist.payloadHashMatches).toBe(true);
      expect(result.checklist.exportHashMatches).toBe(true);
      expect(result.checklist.signatureValid).toBe(true);
    }
  });

  it('materializes export packs byte-for-byte', () => {
    for (const attestation of RSSP_ATTESTATIONS) {
      const buffer = materializeExport(attestation);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      const roundTrip = buffer.toString('base64');
      expect(roundTrip).toEqual(attestation.exportPack);
    }
  });

  it('detects tampering if export hashes change', () => {
    const attestation = RSSP_ATTESTATIONS[0];
    const tampered = {
      ...attestation,
      exportPack: Buffer.from('tampered', 'utf-8').toString('base64'),
    };
    const result = verifyAttestation(tampered);
    expect(result.ok).toBe(false);
    expect(result.checklist.exportHashMatches).toBe(false);
  });
});
