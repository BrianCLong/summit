#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { buildBundle } from '../../summit/agents/policy/bundle/build-bundle';

function signatureFor(bundleDigest: string) {
  return {
    type: 'sha256' as const,
    signer: 'governance-bot',
    sig: createHash('sha256').update(bundleDigest).digest('hex'),
  };
}

for (const env of ['dev', 'test', 'prod'] as const) {
  const approvals = env === 'prod' && process.env.ALLOW_GOV_APPROVAL === '1' ? ['governance'] : [];
  const draft = buildBundle(env, {
    createdAt: '2026-01-01T00:00:00.000Z',
    approvals,
    signatures: [],
  });

  const signatures =
    env === 'prod' && approvals.includes('governance')
      ? [signatureFor(`${draft.policy_sha256}:${draft.skills_sha256}:${env}`)]
      : [];

  buildBundle(env, {
    createdAt: '2026-01-01T00:00:00.000Z',
    approvals,
    signatures,
  });
}
