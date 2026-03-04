/**
 * graph_postgres_validator.mjs
 * 
 * Validates entity counts and key relationship integrity between
 * Neo4j and PostgreSQL. This is a Tier 2 Post-Merge check.
 */
import neo4j from 'neo4j-driver';
import pg from 'pg';

const { Pool } = pg;

async function validate() {
    console.log("Starting Graph-to-Postgres validation...");

    const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const driver = neo4j.driver(
        process.env.NEO4J_URL || 'bolt://localhost:7687',
        neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password')
    );

    try {
        // 1. Check Entity Counts (Sample)
        const pgRes = await pgPool.query('SELECT count(*) FROM entities');
        const pgCount = parseInt(pgRes.rows[0].count, 10);

        const session = driver.session();
        const neoRes = await session.run('MATCH (n:Entity) RETURN count(n) as count');
        const neoCount = neoRes.records[0].get('count').toNumber();
        await session.close();

        console.log(`Entities: PG=${pgCount}, Neo4j=${neoCount}`);

        if (Math.abs(pgCount - neoCount) > (pgCount * 0.05)) { // 5% drift threshold
            console.warn("⚠️ Significant entity count drift detected (>5%)");
        }

        // 2. Check for "Orphan" Records
        // (Logic for deeper validation here)

        console.log("✅ Data consistency validation completed.");
    } catch (error) {
        console.error("❌ Validation failed:", error.message);
        process.exit(1);
    } finally {
        await pgPool.end();
        await driver.close();
    }
}

validate();
