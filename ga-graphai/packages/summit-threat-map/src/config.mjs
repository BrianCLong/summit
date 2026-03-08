import { readFileSync } from 'node:fs';

const defaultConfig = {
  weights: {
    exposure: 0.4,
    compromise: 0.4,
    severity: 0.2,
    kevMultiplier: 1.35,
  },
  halfLifeMinutes: 90,
};

function parseScalar(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function parseSimpleYaml(raw) {
  const lines = raw.split('\n');
  const out = { weights: {} };
  let section = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }
    if (!line.startsWith(' ') && line.trim().endsWith(':')) {
      section = line.replace(':', '').trim();
      continue;
    }
    const [k, v] = line.trim().split(':').map((x) => x.trim());
    if (!k || v === undefined) {
      continue;
    }
    if (section === 'weights') {
      out.weights[k] = parseScalar(v);
    } else {
      out[k] = parseScalar(v);
    }
  }
  return out;
}

export function loadScoringConfig(path = 'scoring.yaml') {
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = parseSimpleYaml(raw);
    return {
      weights: {
        ...defaultConfig.weights,
        ...(parsed.weights ?? {}),
      },
      halfLifeMinutes: parsed.halfLifeMinutes ?? defaultConfig.halfLifeMinutes,
    };
  } catch {
    return defaultConfig;
  }
}
