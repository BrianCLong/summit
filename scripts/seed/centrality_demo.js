#!/usr/bin/env node
const neo4j = require('neo4j-driver');

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const pass = process.env.NEO4J_PASS || 'neo4jpass';

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
  const s = driver.session();
  try {
    await s.run(
      'MERGE (a:Account {id:"A1"}) SET a.eigenvector=0.42, a.betweenness=0.18, a.community="C12"',
    );
    await s.run(
      'MERGE (b:Account {id:"A2"}) SET b.eigenvector=0.21, b.betweenness=0.09, b.community="C12"',
    );
    await s.run(
      'MERGE (a:Account {id:"A1"})-[:INTERACTS_WITH]->(b:Account {id:"A2"})',
    );
    console.log('Seeded A1,A2 with community C12');
  } finally {
    await s.close();
    await driver.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
