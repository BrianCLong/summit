import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "password")
);

async function load() {
  const session = driver.session();
  try {
    console.log("Cleaning graph...");
    await session.run("MATCH (n) DETACH DELETE n");

    console.log("Seeding graph...");
    // Matching the seed.sql data (Alice id 1, Bob id 2)
    // Note: seed.sql uses auto-increment for ID but we insert explicit values 1 and 2.
    // Usually reliable for first inserts.
    await session.run(`
      CREATE (:Customer {id: 1, name: 'Alice', email: 'alice@example.com'})
      CREATE (:Customer {id: 2, name: 'Bob', email: 'bob@example.com'})
    `);
    console.log("Done.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

load();
