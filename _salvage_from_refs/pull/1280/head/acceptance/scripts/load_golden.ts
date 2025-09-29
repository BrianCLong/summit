import fs from 'fs';
import csv from 'csv-parse/sync';
import neo4j from 'neo4j-driver';
import { Client } from 'pg';

(async function main(){
  const neo = neo4j.driver(process.env.NEO4J_URL!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!));
  const pg = new Client({ connectionString: process.env.PG_URL! });
  await pg.connect();

  const ents = csv.parse(fs.readFileSync('acceptance/data/golden/entities.csv'),{columns:true});
  const rels = csv.parse(fs.readFileSync('acceptance/data/golden/relationships.csv'),{columns:true});
  const erc  = csv.parse(fs.readFileSync('acceptance/data/golden/er_candidates.csv'),{columns:true});

  const s = neo.session();
  for (const e of ents){
    await s.run('MERGE (n:Entity {id:$id}) SET n+= $props', { id: e.id, props: { type:e.type, name:e.name, tags:e.tags, license:e.license, purpose:e.purpose, retention:e.retention }});
  }
  for (const r of rels){
    await s.run('MATCH (a:Entity {id:$from}),(b:Entity {id:$to}) MERGE (a)-[x:'+r.rel+']->(b) SET x.weight = toFloat($w)', { from:r.from, to:r.to, w:r.weight });
  }
  await s.close();

  // ER candidates → queue table
  await pg.query('BEGIN');
  for (const c of erc){
    await pg.query('insert into er_queue(idempotency_key, external_id, name, confidence) values($1,$2,$3,$4) on conflict do nothing', [c.idempotencyKey, c.externalId, c.candidateName, c.confidence]);
  }
  await pg.query('COMMIT');

  await neo.close();
  await pg.end();
  console.log('Golden dataset loaded.');
})();
