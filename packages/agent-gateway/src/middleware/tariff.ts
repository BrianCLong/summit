import { tariff } from '@intelgraph/gateway-tariff';

export function applyTariffToRequest(sig: {formatSig:string; timingSig:string; xformSig:string}) {
  const t = tariff(sig);
  return {
    enforce: async () => {
      if (t.throttleMs) await new Promise(r => setTimeout(r, t.throttleMs));
      return t;
    }
  };
}