"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const csv_parse_1 = require("csv-parse");
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const provenance_1 = require("./provenance");
const argv = await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .option('local', { type: 'boolean' })
    .parse();
const [csvPath, mappingPath] = argv._.map(String);
const mapping = JSON.parse(fs_1.default.readFileSync(mappingPath, 'utf-8'));
const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI, neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
const session = driver.session();
const rows = [];
fs_1.default.createReadStream(csvPath)
    .pipe((0, csv_parse_1.parse)({ columns: true }))
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
    const tx = session.beginTransaction();
    try {
        for (const r of rows) {
            const pid = r[mapping.person.id];
            const name = r[mapping.person.name];
            const email = r[mapping.person.email];
            const org = r[mapping.org.name];
            const domain = r[mapping.org.domain];
            const since = r[mapping.since || 'since'];
            const h = (0, provenance_1.hashRow)(r);
            await tx.run(`MERGE (p:Person {id:$pid, tenant_id:$tid})
         ON CREATE SET p.name=$name, p.email=$email
         MERGE (o:Organization {id: toLower(replace($org,' ','-')), tenant_id:$tid})
         ON CREATE SET o.name=$org, o.domain=$domain
         MERGE (p)-[r:EMPLOYED_BY {tenant_id:$tid}]->(o)
         ON CREATE SET r.since=$since, r.provenance=$h`, {
                pid,
                tid: process.env.TENANT_ID || 'demo-tenant',
                name,
                email,
                org,
                domain,
                since,
                h,
            });
        }
        await tx.commit();
        console.log(`Ingested ${rows.length} rows`);
    }
    catch (e) {
        console.error(e);
        await tx.rollback();
    }
    finally {
        await session.close();
        await driver.close();
    }
});
