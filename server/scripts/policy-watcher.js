const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger.js').default || require('../utils/logger.js');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function collectPolicies(policyDir) {
  const entries = [];

  for (const file of fs.readdirSync(policyDir)) {
    const fullPath = path.join(policyDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      entries.push(...collectPolicies(fullPath));
      continue;
    }

    if (!file.endsWith('.rego') || fullPath.includes(path.join('policies', 'tests'))) {
      continue;
    }

    const rel = path.relative(policyDir, fullPath).replace(/\.rego$/, '');
    entries.push({ id: rel.replace(/\//g, '.'), path: fullPath, content: fs.readFileSync(fullPath, 'utf8') });
  }

  return entries;
}

async function fetchPolicyRaw(opaUrl, policyId) {
  try {
    const response = await axios.get(`${opaUrl}/v1/policies/${policyId}`);
    return response.data?.result?.raw || null;
  } catch (error) {
    logger.warn({ policyId, error: error.message }, 'Failed to fetch policy from OPA');
    return null;
  }
}

async function comparePolicies() {
  const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
  const policyDir = path.resolve(__dirname, '..', 'policies');
  const policies = collectPolicies(policyDir);

  const driftReport = [];

  for (const policy of policies) {
    const localHash = sha256(policy.content);
    const remoteRaw = await fetchPolicyRaw(opaUrl, policy.id);

    if (!remoteRaw) {
      driftReport.push({
        id: policy.id,
        localHash,
        status: 'unreachable',
        path: policy.path,
      });
      continue;
    }

    const remoteHash = sha256(remoteRaw);
    driftReport.push({
      id: policy.id,
      localHash,
      remoteHash,
      status: localHash === remoteHash ? 'ok' : 'drift',
      path: policy.path,
    });
  }

  const drifted = driftReport.filter((p) => p.status === 'drift');
  const unreachable = driftReport.filter((p) => p.status === 'unreachable');

  drifted.forEach((p) =>
    logger.error({ policyId: p.id, localHash: p.localHash, remoteHash: p.remoteHash }, 'OPA policy drift detected'),
  );
  unreachable.forEach((p) =>
    logger.warn({ policyId: p.id, path: p.path }, 'OPA policy not reachable during drift check'),
  );

  logger.info(
    {
      total: driftReport.length,
      drifted: drifted.length,
      unreachable: unreachable.length,
    },
    'Policy watcher summary',
  );

  if (drifted.length > 0) {
    process.exitCode = 1;
  }
}

comparePolicies();
