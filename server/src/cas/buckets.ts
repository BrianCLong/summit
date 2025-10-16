export function bucketForResidency(residency?: string) {
  const map =
    safeParse<Record<string, string>>(process.env.CAS_BUCKETS_JSON) || {};
  const def = process.env.CAS_BUCKET_DEFAULT || Object.values(map)[0];
  if (!residency) return def;
  return map[residency.toUpperCase()] || def;
}

function safeParse<T = any>(s?: string | null) {
  try {
    return s ? (JSON.parse(s) as T) : undefined;
  } catch {
    return undefined;
  }
}
