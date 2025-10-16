import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function failureProb(pr: number) {
  // features: size, hotpaths, prev flake count, delta coverage, confidence, author fail rate
  const {
    rows: [f],
  } = await pg.query(
    `SELECT size, hot, flakes, d_coverage, confidence, author_fail_rate FROM pr_features WHERE pr=$1`,
    [pr],
  );
  const x = [
    1,
    f.size / 1500,
    f.hot ? 1 : 0,
    f.flakes / 5,
    -f.d_coverage / 10,
    -f.confidence / 100,
    f.author_fail_rate,
  ];
  const w = [-1.2, 0.8, 0.6, 0.5, 0.4, 1.1, 0.9]; // trained offline; placeholder
  const z = w.reduce(
    (s: number, wi: number, i: number) => s + wi * (x[i] as number),
    0,
  );
  const p = 1 / (1 + Math.exp(-z));
  return Math.max(0, Math.min(1, p));
}
