import fc from 'fast-check';
import { verifyManifest } from '../../services/prov-ledger/src/verify';

test('manifest verifier rejects bad hash formats', () => {
  fc.assert(
    fc.property(fc.anything(), (m: any) => {
      try {
        verifyManifest(m);
        return Array.isArray(m?.claims) && m.claims.every((c: any) => /^([a-f0-9]{64})$/.test(c.hashRoot));
      } catch {
        return true;
      }
    }),
  );
});
