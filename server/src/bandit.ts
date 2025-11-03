import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function pickVariant(
  runbook: string,
  stepId: string,
  variants: { key: string }[],
  rewardPrior = { alpha: 1, beta: 1 },
) {
  const { rows } = await pg.query(
    `SELECT variant_key, alpha, beta FROM bandit_state WHERE runbook=$1 AND step_id=$2`,
    [runbook, stepId],
  );
  const state = new Map<string, { alpha: number; beta: number }>(
    rows.map((r: any) => [
      r.variant_key,
      {
        alpha: Number(r.alpha) || rewardPrior.alpha,
        beta: Number(r.beta) || rewardPrior.beta,
      },
    ]),
  );
  let best = variants[0]?.key,
    bestSample = -1;
  for (const v of variants) {
    const s = state.get(v.key) || rewardPrior;
    const sample = sampleBeta(s.alpha, s.beta);
    if (sample > bestSample) {
      bestSample = sample;
      best = v.key;
    }
  }
  return best;
}

export async function updateVariant(
  runbook: string,
  stepId: string,
  variantKey: string,
  reward: number,
) {
  await pg.query(
    `INSERT INTO bandit_state(runbook,step_id,variant_key,alpha,beta,reward_sum,pulls)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (runbook,step_id,variant_key)
     DO UPDATE SET alpha=bandit_state.alpha + $4, beta=bandit_state.beta + $5, reward_sum=bandit_state.reward_sum + $6, pulls=bandit_state.pulls + 1`,
    [runbook, stepId, variantKey, reward, 1 - reward, reward, 1],
  );
}

function sampleBeta(a: number, b: number) {
  return gamma(a) / (gamma(a) + gamma(b));
}
function gamma(k: number) {
  const d = k - 1 / 3,
    c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0,
      v = 0;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    if (Math.random() < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(Math.random()) < 0.5 * x * x + d * (1 - v + Math.log(v)))
      return d * v;
  }
}
function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
