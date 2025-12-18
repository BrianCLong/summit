import express from 'express';
import helmet from 'helmet';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

const PORT = process.env.PORT || 8090;
const attestorBase = process.env.ATTESTOR_BASE || 'http://localhost:8088';
const cache = new Map();

const blockList = ['windows 7', 'xp'];
const stepUpRequirements = ['missing_webauthn_uv'];
const sessionDowngradeRules = ['firewall_off', 'weak_platform'];

function summarizeDecision(attestation) {
  const signals = Array.isArray(attestation.signals) ? attestation.signals : [];
  const os = (attestation.ua?.platform || '').toLowerCase();
  const rationale = [];
  const actions = [];

  if (blockList.some((entry) => os.includes(entry))) {
    actions.push({ rule: 'block_list', action: 'block' });
    rationale.push('Platform on block list');
  }
  if (!attestation.webauthn?.userVerified) {
    actions.push({ rule: 'step_up', action: 'challenge', reason: 'webAuthnUV' });
  }
  if (attestation.local?.offlineMode) {
    signals.push('offline_mode:fc-pwa');
  }
  if (attestation.local && !attestation.local.firewallEnabled) {
    actions.push({ rule: 'downgrade', action: 'reduced_session' });
  }

  const riskScore = attestation.riskScore ?? deriveRisk(attestation);
  const status = riskScore >= 70 ? 'block' : riskScore >= 40 ? 'step_up' : riskScore >= 25 ? 'downgrade' : 'pass';

  return {
    status,
    riskScore,
    actions,
    rationale,
    signals,
    claims: {
      'posture:riskScore': riskScore,
      'posture:status': status,
      'posture:signals': signals,
      'posture:session_action': status,
    },
    privacy: {
      data_minimized: true,
      invasive_collection_blocked: true,
    },
  };
}

function deriveRisk(attestation) {
  let score = 0;
  if (!attestation.secureContext) score += 35;
  if (!attestation.webauthn?.userVerified) score += 20;
  if (!attestation.local?.firewallEnabled) score += 15;
  if ((attestation.ua?.platform || '').toLowerCase().includes('windows 7')) score += 40;
  return score;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', offlineCacheEntries: cache.size });
});

app.post('/evaluate', async (req, res) => {
  const payload = req.body || {};
  if (!payload.deviceId) {
    return res.status(400).json({ error: 'deviceId required' });
  }

  const offlineOnly = payload.offline === true;
  const cacheKey = payload.cacheKey || payload.deviceId;

  if (offlineOnly && cache.has(cacheKey)) {
    return res.json({
      mode: 'offline',
      cacheKey,
      decision: cache.get(cacheKey),
    });
  }

  const attestationRes = await fetch(`${attestorBase}/attest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!attestationRes.ok) {
    return res.status(attestationRes.status).json({ error: 'attestor rejected payload' });
  }

  const attestation = await attestationRes.json();
  const decision = summarizeDecision({ ...payload, riskScore: attestation?.result?.riskScore, signals: attestation?.result?.signals });

  cache.set(cacheKey, decision);

  res.json({
    cacheKey: attestation.cacheKey || cacheKey,
    decision,
    enforcement: enforcementDirectives(decision),
  });
});

app.get('/policies', (_req, res) => {
  res.json({ blockList, stepUpRequirements, sessionDowngradeRules, privacy: ['no invasive collection', 'signals minimized'], offline: true });
});

function enforcementDirectives(decision) {
  const directives = [];
  if (decision.status === 'block') directives.push('deny');
  if (decision.status === 'step_up') directives.push('require_webauthn_uv');
  if (decision.status === 'downgrade') directives.push('restrict_session');
  return directives;
}

if (process.argv.includes('--selftest')) {
  const demoDecision = summarizeDecision({
    secureContext: true,
    webauthn: { userVerified: false },
    ua: { platform: 'Windows 7' },
    local: { firewallEnabled: false },
  });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(demoDecision));
  process.exit(0);
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`device-trust policy listening on ${PORT}`);
});
