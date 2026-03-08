"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../config.js");
const db_js_1 = require("../db.js");
const taxonomy_js_1 = require("../taxonomy.js");
const run = async () => {
    const config = (0, config_js_1.loadConfig)();
    const pool = (0, db_js_1.createPool)(config.databaseUrl);
    await (0, db_js_1.initSchema)(pool);
    await Promise.all(taxonomy_js_1.defaultTaxonomy.map((level) => pool.query(`INSERT INTO taxonomy_levels (code, name, max_duration_days)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING`, [level.code, level.name, level.maxDurationDays])));
    await pool.end();
};
run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Migration failed', err);
    process.exit(1);
});
