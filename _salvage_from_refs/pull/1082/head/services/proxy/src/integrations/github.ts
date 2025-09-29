import { Octokit } from '@octokit/rest';

const owner = process.env.GH_OWNER!;
const repo = process.env.GH_REPO!;
const token = process.env.GH_TOKEN!;
const octo = new Octokit({ auth: token });

export async function fileIncident(title: string, body: string, labels: string[] = ['incident']): Promise<number> {
  const r = await octo.issues.create({ owner, repo, title, body, labels });
  return r.data.number;
}

export async function upsertRunReport(auditId: string, jsonl: string): Promise<void> {
  const path = `runs/${auditId}.jsonl`;
  await octo.repos.createOrUpdateFileContents({
    owner, repo, path,
    message: `chore(run-report): ${auditId}`,
    content: Buffer.from(jsonl).toString('base64'),
    committer: { name: 'sym‑bot', email: 'bot@symphony.local' },
    author: { name: 'sym‑bot', email: 'bot@symphony.local' }
  });
}
