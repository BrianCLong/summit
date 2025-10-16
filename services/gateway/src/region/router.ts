type Req = { residency?: 'EU' | 'US'; prefer?: 'EU' | 'US' };

function safeParse<T>(s?: string) {
  try {
    return s ? (JSON.parse(s) as T) : undefined;
  } catch {
    return undefined;
  }
}

const PEERS =
  safeParse<Record<string, string>>(process.env.REGION_PEERS_JSON) || {};

export function pickHub(req: Req) {
  const home = (req.prefer ||
    req.residency ||
    (process.env.REGION_ID as any) ||
    'US') as string;
  return { home, url: PEERS[home] || process.env.HUB_URL };
}
