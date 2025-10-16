import { Router } from 'express';

export function healthIntegrationsRouter() {
  const r = Router();

  r.get('/health/integrations', async (_req, res) => {
    const out: Record<string, { ok: boolean; note?: string }> = {
      github: { ok: false },
      jira: { ok: false },
      maestro: { ok: false },
    };

    // GitHub App check (optional)
    try {
      const appId = process.env.GITHUB_APP_ID;
      const installationId = Number(process.env.GITHUB_INSTALLATION_ID);
      const privateKey = process.env.GITHUB_PRIVATE_KEY;
      if (appId && installationId && privateKey) {
        const { Octokit } = await import('octokit');
        const { createAppAuth } = await import('@octokit/auth-app');
        const gh = new Octokit({
          authStrategy: createAppAuth as any,
          auth: { appId: Number(appId), installationId, privateKey },
        });
        await gh.request('GET /installation/repositories');
        out.github.ok = true;
      } else {
        out.github.note = 'missing env';
      }
    } catch (e: any) {
      out.github.note = e?.status ? `HTTP ${e.status}` : 'auth failed';
    }

    // Jira check (optional)
    try {
      const base = process.env.JIRA_BASE_URL;
      const email = process.env.JIRA_EMAIL;
      const token = process.env.JIRA_API_TOKEN;
      if (base && email && token) {
        const auth = Buffer.from(`${email}:${token}`).toString('base64');
        const r = await fetch(`${base}/rest/api/3/myself`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        out.jira.ok = r.ok;
        if (!r.ok) out.jira.note = `HTTP ${r.status}`;
      } else {
        out.jira.note = 'missing env';
      }
    } catch {
      out.jira.note = 'auth failed';
    }

    // Maestro GraphQL check
    try {
      const base =
        process.env.MAESTRO_BASE_URL || 'https://maestro.dev.topicality.co';
      const path = process.env.MAESTRO_GRAPHQL_PATH || '/api/graphql';
      const q = `query { __typename }`;
      const rsp = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      out.maestro.ok = rsp.ok;
      if (!rsp.ok) out.maestro.note = `HTTP ${rsp.status}`;
    } catch {
      out.maestro.note = 'unreachable';
    }

    const greens = Object.values(out).filter((v) => v.ok).length;
    const code = greens === 3 ? 200 : greens > 0 ? 207 : 503;
    res.status(code).json(out);
  });

  return r;
}
