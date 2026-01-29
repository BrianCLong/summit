import { Pool } from 'pg';
import neo4j from 'neo4j-driver';

export async function generateFixtures(pgUrl: string, neoUrl: string) {
    const pool = new Pool({ connectionString: pgUrl });
    const driver = neo4j.driver(neoUrl);
    const session = driver.session();

    try {
        // Clear data
        await pool.query('DROP TABLE IF EXISTS customers CASCADE');
        await pool.query(`
            CREATE TABLE customers (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT,
                tier TEXT,
                created_at TIMESTAMP
            )
        `);

        await session.run('MATCH (n:Customer) DETACH DELETE n');
        // Optional: Create constraint for index/uniqueness
        try {
            await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (n:Customer) REQUIRE n.customerId IS UNIQUE');
        } catch (e) {
            // Ignore if not supported or exists
        }

        // Insert Golden Data (Synced)
        for (let i = 1; i <= 10; i++) {
            const name = `User ${i}`;
            const email = `user${i}@example.com`;
            const tier = 'free';
            const createdAt = new Date('2023-01-01');

            const res = await pool.query(
                'INSERT INTO customers (id, name, email, tier, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [i, name, email, tier, createdAt]
            );
            const id = res.rows[0].id;

            await session.run(
                'CREATE (c:Customer {customerId: $id, name: $name, email: $email, tier: $tier, createdAt: $createdAt})',
                { id: neo4j.int(id), name, email, tier, createdAt: createdAt.toISOString() }
            );
        }

        // Insert Drift: Missing Node in Graph (ID 11)
        await pool.query(
            "INSERT INTO customers (id, name, email, tier, created_at) VALUES (11, 'Ghost', 'ghost@example.com', 'free', NOW())"
        );

        // Insert Drift: Orphan Node in Graph (ID 99)
        await session.run(
            "CREATE (c:Customer {customerId: 99, name: 'Orphan', email: 'orphan@example.com', tier: 'free', createdAt: '2023-01-01T00:00:00.000Z'})"
        );

        // Insert Drift: Prop Mismatch (ID 12)
        await pool.query(
            "INSERT INTO customers (id, name, email, tier, created_at) VALUES (12, 'Mismatch', 'mismatch@example.com', 'pro', NOW())"
        );
        await session.run(
            "CREATE (c:Customer {customerId: 12, name: 'WrongName', email: 'mismatch@example.com', tier: 'pro', createdAt: '2023-01-01T00:00:00.000Z'})"
        );

        console.log('Fixtures generated with controlled drift.');
    } finally {
        await pool.end();
        await session.close();
        await driver.close();
    }
}
