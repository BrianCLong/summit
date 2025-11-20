import { verifyDisclosure } from './wallet';
export function verifyKPWMediaBundle(bundle, publicPem) {
    const ok = verifyDisclosure(bundle, publicPem);
    const hasContradiction = bundle.disclosedSteps.some((s) => !!s.contradiction);
    return { ok, hasContradiction };
}
