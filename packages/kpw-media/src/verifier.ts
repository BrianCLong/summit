import { SelectiveDisclosureBundle } from './types';
import { verifyDisclosure } from './wallet';

export function verifyKPWMediaBundle(bundle: SelectiveDisclosureBundle, publicPem: string) {
  const ok = verifyDisclosure(bundle, publicPem);
  const hasContradiction = bundle.disclosedSteps.some(s => !!s.contradiction);
  return { ok, hasContradiction };
}