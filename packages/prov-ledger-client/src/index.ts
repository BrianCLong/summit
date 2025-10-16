import { verifyDisclosure } from '@intelgraph/prov-ledger/src/wallet';
import { SelectiveDisclosureBundle } from '@intelgraph/prov-ledger/src/types';

export { verifyDisclosure };

export async function verifyKPWBadge(bundleJson: string, publicKeyPem: string) {
  const bundle: SelectiveDisclosureBundle = JSON.parse(bundleJson);
  const ok = verifyDisclosure(bundle, publicKeyPem);
  const hasContradiction = bundle.disclosedSteps.some(
    (s) => (s as any).contradiction,
  ); // Cast to any to access contradiction
  return { ok, hasContradiction };
}
