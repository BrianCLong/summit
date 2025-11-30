'use strict';

const defaultPolicy = {
  blockList: {
    userIds: [],
    devices: [],
    browsers: [],
    platforms: []
  },
  stepUp: {
    minimumScore: 80,
    factor: 'webauthn'
  },
  downgrade: {
    minimumScore: 60,
    capabilities: ['read-only']
  },
  offlineMode: false,
  privacyBudgetMin: 5
};

function scoreSignal(signal) {
  let score = 90;
  const reasons = [];

  if (!signal.webauthn?.transport || signal.webauthn.signCount === 0) {
    score -= 20;
    reasons.push('WebAuthn weak or missing');
  }

  (signal.localChecks || []).forEach(check => {
    if (!check.passed) {
      score -= 8;
      reasons.push(check.name);
    }
  });

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function blocked(policy, signal, deviceHash) {
  if (policy.blockList.userIds.includes(signal.userId)) return 'user blocked';
  if (policy.blockList.devices.includes(deviceHash)) return 'device blocked';
  if (policy.blockList.browsers.includes(signal.userAgent.browser)) return 'browser blocked';
  if (policy.blockList.platforms.includes(signal.userAgent.platform)) return 'platform blocked';
  return '';
}

function evaluate(policyInput, signal, deviceHash) {
  const policy = { ...defaultPolicy, ...policyInput };
  const { score, reasons } = scoreSignal(signal);

  const verdict = { score, reasons: [...reasons], claims: { device_hash: deviceHash } };

  const blockReason = blocked(policy, signal, deviceHash);
  if (blockReason) {
    verdict.verdict = 'deny';
    verdict.reasons.push(blockReason);
    return verdict;
  }

  if (policy.offlineMode) {
    verdict.verdict = 'offline-permit';
    verdict.reasons.push('offline safe-path enabled');
    return verdict;
  }

  if (score < policy.privacyBudgetMin) {
    verdict.verdict = 'deny';
    verdict.reasons.push('privacy budget insufficient');
    return verdict;
  }

  if (score < policy.stepUp.minimumScore) {
    verdict.verdict = 'step-up-required';
    verdict.claims.step_up_factor = policy.stepUp.factor;
    return verdict;
  }

  if (score < policy.downgrade.minimumScore) {
    verdict.verdict = 'session-downgraded';
    verdict.claims.downgraded_capabilities = policy.downgrade.capabilities;
    return verdict;
  }

  verdict.verdict = 'permit';
  return verdict;
}

module.exports = {
  defaultPolicy,
  evaluate,
  scoreSignal
};
