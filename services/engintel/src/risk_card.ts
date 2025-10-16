import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function riskCard(pr: number) {
  const {
    rows: [m],
  } = await pg.query(
    `
    WITH ch AS (SELECT additions+deletions AS delta FROM pr WHERE id=$1),
    fl AS (SELECT count(*) AS flakes FROM flakes WHERE pr=$1),
    hot AS (SELECT count(*) AS hot FROM changes WHERE pr=$1 AND path ~ 'server/src/(scheduler|steps)'),
    owners AS (SELECT array_agg(DISTINCT owner) AS owners FROM ownership WHERE pr=$1)
    SELECT (CASE WHEN hot.hot>0 THEN 2 ELSE 0 END + CASE WHEN fl.flakes>0 THEN 1 ELSE 0 END + CASE WHEN ch.delta>1500 THEN 2 WHEN ch.delta>500 THEN 1 ELSE 0 END) AS risk,
           owners.owners
    FROM ch, fl, hot, owners`,
    [pr],
  );
  return { risk: Number(m?.risk || 0), owners: m?.owners || [] };
}
