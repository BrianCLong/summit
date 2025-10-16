import express from 'express';
import neo4j from 'neo4j-driver';
const app = express();
app.use(express.json());
const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!),
);
app.post('/ingest', async (req, res) => {
  const { repo, edges } = req.body; // edges: [{from, to, kind}]
  const s = driver.session();
  try {
    await s.executeWrite(async (tx) => {
      await tx.run('MERGE (r:Repo {name:$repo})', { repo });
      for (const e of edges) {
        await tx.run(
          'MERGE (a:Repo {name:$f}) MERGE (b:Repo {name:$t}) MERGE (a)-[:DEPENDS_ON {kind:$k}]->(b)',
          { f: e.from, t: e.to, k: e.kind },
        );
      }
    });
    res.sendStatus(204);
  } finally {
    await s.close();
  }
});
app.get('/impacted/:repo/:sha', async (req, res) => {
  const s = driver.session();
  const q = `MATCH (a:Repo {name:$repo})-[:DEPENDS_ON*0..3]->(b:Repo) RETURN DISTINCT b.name AS impacted`;
  const r = await s.run(q, { repo: req.params.repo });
  res.json({ impacted: r.records.map((x) => x.get('impacted')) });
});
app.listen(8082);
