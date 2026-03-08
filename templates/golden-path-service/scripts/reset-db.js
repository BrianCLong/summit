"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const connectionString = process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/golden_path';
const reset = async () => {
    const client = new pg_1.Client({ connectionString });
    await client.connect();
    await client.query('DROP TABLE IF EXISTS payments;');
    await client.end();
};
reset()
    .then(() => {
    console.log('Reset complete');
    process.exit(0);
})
    .catch((error) => {
    console.error('Reset failed', error);
    process.exit(1);
});
