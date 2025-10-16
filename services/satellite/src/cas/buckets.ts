export function pickBucket(override?: string) {
  if (override) return override;
  const map =
    safeParse<Record<string, string>>(process.env.CAS_BUCKETS_JSON) || {};
  const def = process.env.CAS_BUCKET_DEFAULT || Object.values(map)[0];
  const res = (process.env.SITE_RESIDENCY || '').toUpperCase();
  return res && map[res] ? map[res] : def;
}

function safeParse<T = any>(s?: string | null) {
  try {
    return s ? (JSON.parse(s) as T) : undefined;
  } catch {
    return undefined;
  }
}
