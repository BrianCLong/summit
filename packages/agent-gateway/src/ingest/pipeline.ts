import { AFLStore } from '@intelgraph/afl-store';
import { applyTariffToRequest } from '../middleware/tariff';

const store = new AFLStore(process.env.AFL_REDIS_URL);

export async function handleInbound(buf: Buffer, meta: unknown){
  // 1) fingerprint
  const fp = {
    contentHash: meta.contentHash, formatSig: meta.formatSig, timingSig: meta.timingSig,
    xformSig: meta.xformSig || 'nokpw', route: meta.route || 'unknown'
  };
  await store.put(fp as unknown);

  // 2) tariff + enforce
  const t = applyTariffToRequest({ formatSig: fp.formatSig, timingSig: fp.timingSig, xformSig: fp.xformSig });
  const tv = await t.enforce();

  // 3) policy (LAC/OPA) – call your existing gate here; include tv.minProofLevel
  return { tariff: tv, fingerprint: fp };
}