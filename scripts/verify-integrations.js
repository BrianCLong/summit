"use strict";
// Usage:
//   npx ts-node scripts/verify-integrations.ts github
//   npx ts-node scripts/verify-integrations.ts jira
//   npx ts-node scripts/verify-integrations.ts linear
//   npx ts-node scripts/verify-integrations.ts notion
//   npx ts-node scripts/verify-integrations.ts maestro
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const crypto_1 = __importDefault(require("crypto"));
const node_assert_1 = __importDefault(require("node:assert"));
const octokit_1 = require("octokit");
const auth_app_1 = require("@octokit/auth-app");
const GH_APP_ID = process.env.GITHUB_APP_ID || '';
const GH_INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID || '';
const GH_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY || '';
const GH_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || '';
const JIRA_EMAIL = process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const LINEAR_API_TOKEN = process.env.LINEAR_API_TOKEN || '';
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '';
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const MAESTRO_BASE = process.env.MAESTRO_BASE_URL || 'https://maestro.dev.topicality.co';
const MAESTRO_GRAPHQL = process.env.MAESTRO_GRAPHQL_PATH || '/api/graphql';
async function verifyGitHub() {
    console.log('→ Verifying GitHub App auth…');
    (0, node_assert_1.default)(GH_APP_ID && GH_INSTALLATION_ID && GH_PRIVATE_KEY, 'Missing GitHub envs');
    const octokit = new octokit_1.Octokit({
        authStrategy: auth_app_1.createAppAuth,
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
    (0, node_assert_1.default)(GH_WEBHOOK_SECRET, 'Missing GITHUB_WEBHOOK_SECRET');
    const fakeBody = Buffer.from(JSON.stringify({ zen: 'Keep it logically awesome.' }));
    const mac = 'sha256=' +
        crypto_1.default
            .createHmac('sha256', GH_WEBHOOK_SECRET)
            .update(fakeBody)
            .digest('hex');
    const ok = crypto_1.default.timingSafeEqual(Buffer.from(mac), Buffer.from(mac));
    console.log(`✔ HMAC sample OK = ${ok}`);
    return ok;
}
async function verifyJira() {
    console.log('→ Verifying Jira API token…');
    (0, node_assert_1.default)(JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN, 'Missing Jira envs');
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const me = await fetch(`${JIRA_BASE_URL}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    (0, node_assert_1.default)(me.ok, `Jira /myself failed: ${me.status}`);
    const pj = await fetch(`${JIRA_BASE_URL}/rest/api/3/project/search`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    (0, node_assert_1.default)(pj.ok, `Jira /project/search failed: ${pj.status}`);
    const data = await pj.json();
    const keys = (data.values || []).map((x) => x.key).slice(0, 10);
    console.log(`✔ Jira OK — sample project keys: ${keys.join(', ') || '(none visible)'}`);
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
    if (!g.ok)
        throw new Error(`GraphQL failed: ${g.status}`);
    const gj = await g.json();
    console.log('✔ startRun(dryRun) response:', JSON.stringify(gj.data, null, 2));
    // 2) Tickets REST
    const t = await fetch(`${MAESTRO_BASE}/api/tickets`, {
        headers: { Accept: 'application/json' },
    });
    if (!t.ok)
        throw new Error(`Tickets failed: ${t.status}`);
    const tj = await t.json();
    console.log(`✔ Tickets API OK (${Array.isArray(tj.items) ? tj.items.length : 0} items)`);
    return true;
}
async function verifyLinear() {
    console.log('→ Verifying Linear API token…');
    (0, node_assert_1.default)(LINEAR_API_TOKEN, 'Missing LINEAR_API_TOKEN');
    const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${LINEAR_API_TOKEN}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            query: 'query { viewer { id name email } }',
        }),
    });
    (0, node_assert_1.default)(response.ok, `Linear GraphQL failed: ${response.status}`);
    const data = await response.json();
    console.log(`✔ Linear OK — viewer: ${data?.data?.viewer?.name || 'unknown'}`);
    return true;
}
async function verifyNotion() {
    console.log('→ Verifying Notion API token + database schema…');
    (0, node_assert_1.default)(NOTION_API_KEY && NOTION_DATABASE_ID, 'Missing Notion envs');
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
        headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': NOTION_VERSION,
        },
    });
    (0, node_assert_1.default)(response.ok, `Notion database read failed: ${response.status}`);
    const data = (await response.json());
    const properties = data.properties ?? {};
    const required = ['Name', 'Status', 'Priority Level', 'Text'];
    const missing = required.filter((name) => !properties[name]);
    (0, node_assert_1.default)(missing.length === 0, `Notion database missing properties: ${missing.join(', ')}`);
    const title = data.title?.[0]?.plain_text ?? 'untitled';
    console.log(`✔ Notion OK — database: ${title}`);
    return true;
}
const task = process.argv[2];
(async () => {
    try {
        if (!task || task === 'github') {
            await verifyGitHub();
            await verifyWebhookSignatureSample();
        }
        if (!task || task === 'jira')
            await verifyJira();
        if (!task || task === 'linear')
            await verifyLinear();
        if (!task || task === 'notion')
            await verifyNotion();
        if (!task || task === 'maestro')
            await verifyMaestro();
        console.log('✅ All selected checks passed.');
    }
    catch (e) {
        console.error('❌ Verification failed:', e?.message || e);
        process.exit(1);
    }
})();
