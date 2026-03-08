#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const build_bundle_1 = require("../../summit/agents/policy/bundle/build-bundle");
function signatureFor(bundleDigest) {
    return {
        type: 'sha256',
        signer: 'governance-bot',
        sig: (0, node_crypto_1.createHash)('sha256').update(bundleDigest).digest('hex'),
    };
}
for (const env of ['dev', 'test', 'prod']) {
    const approvals = env === 'prod' && process.env.ALLOW_GOV_APPROVAL === '1' ? ['governance'] : [];
    const draft = (0, build_bundle_1.buildBundle)(env, {
        createdAt: '2026-01-01T00:00:00.000Z',
        approvals,
        signatures: [],
    });
    const signatures = env === 'prod' && approvals.includes('governance')
        ? [signatureFor(`${draft.policy_sha256}:${draft.skills_sha256}:${env}`)]
        : [];
    (0, build_bundle_1.buildBundle)(env, {
        createdAt: '2026-01-01T00:00:00.000Z',
        approvals,
        signatures,
    });
}
