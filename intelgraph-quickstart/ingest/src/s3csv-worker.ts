import fs from "fs";
import { parse } from "csv-parse";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import neo4j from "neo4j-driver";
import { hashRow } from "./provenance";

const argv = await yargs(hideBin(process.argv)).option("local", { type: "boolean" }).parse();
const [csvPath, mappingPath] = argv._.map(String);
const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);
const session = driver.session();

const rows: any[] = [];
fs.createReadStream(csvPath)
  .pipe(parse({ columns: true }))
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    const tx = session.beginTransaction();
    try {
      for (const r of rows) {
        const pid = r[mapping.person.id];
        const name = r[mapping.person.name];
        const email = r[mapping.person.email];
        const org = r[mapping.org.name];
        const domain = r[mapping.org.domain];
        const since = r[mapping.since || "since"];
        const h = hashRow(r);
        await tx.run(
          `MERGE (p:Person {id:$pid, tenant_id:$tid})
         ON CREATE SET p.name=$name, p.email=$email
         MERGE (o:Organization {id: toLower(replace($org,' ','-')), tenant_id:$tid})
         ON CREATE SET o.name=$org, o.domain=$domain
         MERGE (p)-[r:EMPLOYED_BY {tenant_id:$tid}]->(o)
         ON CREATE SET r.since=$since, r.provenance=$h`,
          {
            pid,
            tid: process.env.TENANT_ID || "demo-tenant",
            name,
            email,
            org,
            domain,
            since,
            h,
          }
        );
      }
      await tx.commit();
      console.log(`Ingested ${rows.length} rows`);
    } catch (e) {
      console.error(e);
      await tx.rollback();
    } finally {
      await session.close();
      await driver.close();
    }
  });
