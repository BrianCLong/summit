import { request } from 'undici';
import { readSloSnapshot, readUnitCosts } from './sources';

const MC_URL = process.env.MC_URL!; // https://mc.prod/graphql
const MC_TOKEN = process.env.MC_TOKEN!;

export async function publishEvidence(
  releaseId: string,
  service = 'companyos',
  artifacts: { type: string; sha256: string }[],
) {
  const slo = await readSloSnapshot(service);
  const cost = await readUnitCosts();
  const query = `mutation($input: EvidenceInput!){ publishEvidence(input:$input){ id releaseId createdAt } }`;
  const input = { releaseId, service, artifacts, slo, cost };
  const res = await request(`${MC_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MC_TOKEN}`,
    },
    body: JSON.stringify({ query, variables: { input } }),
  });
  if (res.statusCode >= 300)
    throw new Error(`publishEvidence HTTP ${res.statusCode}`);
  const body = await res.body.json();
  if ((body as any).errors)
    throw new Error(
      `publishEvidence GQL ${JSON.stringify((body as any).errors)}`,
    );
  return (body as any).data.publishEvidence;
}
