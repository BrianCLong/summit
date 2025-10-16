export function assertFresh(features: Record<string, any>, maxAgeSec = 3600) {
  const now = Date.now() / 1000;
  for (const [k, v] of Object.entries(features)) {
    if (v && typeof v === 'object' && v._ts && now - v._ts > maxAgeSec) {
      metrics.stale_features_total.inc({ feature: k });
      delete features[k]; // fail-open: drop feature
    }
  }
  return features;
}
