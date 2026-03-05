function coerceNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function fallbackH3(lat, lon) {
  const latBucket = Math.round((lat ?? 0) * 10);
  const lonBucket = Math.round((lon ?? 0) * 10);
  return `h3_${latBucket}_${lonBucket}`;
}

export function normalizeShodanEvent(raw) {
  const lat = coerceNumber(raw?.location?.latitude);
  const lon = coerceNumber(raw?.location?.longitude);
  const cve = Array.isArray(raw?.vulns) ? raw.vulns[0] : undefined;
  return {
    source: 'shodan',
    sourceEventId: String(raw.id ?? `${raw.ip_str}-${raw.timestamp}`),
    observedAt: new Date(raw.timestamp ?? Date.now()).toISOString(),
    ip: raw.ip_str,
    asn: coerceNumber(raw.asn),
    port: coerceNumber(raw.port),
    cve,
    exposureState: raw.port ? 'exposed' : 'not_exposed',
    compromiseState: raw.tags?.includes?.('compromised') ? 'compromised' : 'none',
    severity: cve ? 0.8 : 0.5,
    confidence: 0.7,
    lat,
    lon,
    h3Index: fallbackH3(lat, lon),
    evidence: {
      refs: [String(raw.id ?? 'shodan-stream')],
      citations: ['Shodan Streaming API'],
      why: cve ? `Exposure observed with ${cve}` : 'Exposure signal from open service banner',
    },
    rawEvent: raw,
  };
}

export function normalizeShadowserverEvent(raw, reportName) {
  const lat = coerceNumber(raw?.latitude);
  const lon = coerceNumber(raw?.longitude);
  const cve = raw?.cve ?? undefined;
  const compromised = String(raw?.infection ?? '').toLowerCase() === 'true';
  return {
    source: 'shadowserver',
    sourceEventId: String(raw?.id ?? `${reportName}-${raw?.ip}-${raw?.timestamp}`),
    observedAt: new Date(raw?.timestamp ?? Date.now()).toISOString(),
    ip: raw?.ip,
    asn: coerceNumber(raw?.asn),
    port: coerceNumber(raw?.port),
    cve,
    exposureState: raw?.ip ? 'exposed' : 'not_exposed',
    compromiseState: compromised ? 'compromised' : 'suspected',
    severity: compromised ? 0.9 : 0.6,
    confidence: 0.8,
    lat,
    lon,
    h3Index: fallbackH3(lat, lon),
    evidence: {
      refs: [String(raw?.id ?? reportName)],
      citations: ['Shadowserver Reports API'],
      why: compromised ? 'Compromise indicator in Shadowserver report' : 'Shadowserver exposure indicator',
    },
    rawEvent: raw,
  };
}
