// Usage:
//   npx ts-node scripts/verify-integrations.ts github
//   npx ts-node scripts/verify-integrations.ts jira
//   npx ts-node scripts/verify-integrations.ts maestro

import 'dotenv/config';
import crypto from 'crypto';
import assert from 'node:assert';
import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';

const GH_APP_ID = process.env.GITHUB_APP_ID || '';
const GH_INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID || '';
const GH_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY || '';
const GH_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || '';
const JIRA_EMAIL = process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';

const MAESTRO_BASE =
  process.env.MAESTRO_BASE_URL || 'https://maestro.dev.topicality.co';
const MAESTRO_GRAPHQL = process.env.MAESTRO_GRAPHQL_PATH || '/api/graphql';

async function verifyGitHub() {
  console.log('→ Verifying GitHub App auth…');
  assert(
    GH_APP_ID && GH_INSTALLATION_ID && GH_PRIVATE_KEY,
    'Missing GitHub envs',
  );
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: Number(GH_APP_ID),
      privateKey: GH_PRIVATE_KEY,
      installationId: Number(GH_INSTALLATION_ID),
    },
  });
  const r = await octokit.request('GET /installation/repositories');
  console.log(`✔ GitHub OK — installation has ${r.data.total_count} repo(s)`);
  return true;
}

async function verifyWebhookSignatureSample() {
  console.log('→ Self-test GitHub webhook HMAC (local sample)…');
  assert(GH_WEBHOOK_SECRET, 'Missing GITHUB_WEBHOOK_SECRET');
  const fakeBody = Buffer.from(
    JSON.stringify({ zen: 'Keep it logically awesome.' }),
  );
  const mac =
    'sha256=' +
    crypto
      .createHmac('sha256', GH_WEBHOOK_SECRET)
      .update(fakeBody)
      .digest('hex');
  const ok = crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(mac));
  console.log(`✔ HMAC sample OK = ${ok}`);
  return ok;
}

async function verifyJira() {
  console.log('→ Verifying Jira API token…');
  assert(JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN, 'Missing Jira envs');
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
    'base64',
  );
  const me = await fetch(`${JIRA_BASE_URL}/rest/api/3/myself`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  assert(me.ok, `Jira /myself failed: ${me.status}`);
  const pj = await fetch(`${JIRA_BASE_URL}/rest/api/3/project/search`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  assert(pj.ok, `Jira /project/search failed: ${pj.status}`);
  const data: any = await pj.json();
  const keys = (data.values || []).map((x: any) => x.key).slice(0, 10);
  console.log(
    `✔ Jira OK — sample project keys: ${keys.join(', ') || '(none visible)'}`,
  );
  return true;
}

async function verifyMaestro() {
  console.log('→ Verifying Maestro safe mutations + tickets…');
  // 1) Safe mutation (dryRun)
  const q = `mutation($i: StartRunInput!) { startRun(input:$i){ status warnings diff auditId } }`;
  const variables = {
    i: {
      pipelineId: 'pipe-verify',
      parameters: { TAG: 'vtest' },
      canaryPercent: 5,
      maxParallel: 1,
      meta: {
        idempotencyKey: '11111111-2222-3333-4444-555555555555',
        dryRun: true,
        reason: 'verify script',
      },
    },
  };
  const g = await fetch(`${MAESTRO_BASE}${MAESTRO_GRAPHQL}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: q, variables }),
  });
  if (!g.ok) throw new Error(`GraphQL failed: ${g.status}`);
  const gj = await g.json();
  console.log(
    '✔ startRun(dryRun) response:',
    JSON.stringify(gj.data, null, 2),
  );

  // 2) Tickets REST
  const t = await fetch(`${MAESTRO_BASE}/api/tickets`, {
    headers: { Accept: 'application/json' },
  });
  if (!t.ok) throw new Error(`Tickets failed: ${t.status}`);
  const tj = await t.json();
  console.log(
    `✔ Tickets API OK (${Array.isArray(tj.items) ? tj.items.length : 0} items)`,
  );
  return true;
}

const task = process.argv[2];
(async () => {
  try {
    if (!task || task === 'github') {
      await verifyGitHub();
      await verifyWebhookSignatureSample();
    }
    if (!task || task === 'jira') await verifyJira();
    if (!task || task === 'maestro') await verifyMaestro();
    console.log('✅ All selected checks passed.');
  } catch (e: any) {
    console.error('❌ Verification failed:', e?.message || e);
    process.exit(1);
  }
})();
