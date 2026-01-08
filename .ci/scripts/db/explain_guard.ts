#!/usr/bin/env ts-node
import fs from "fs";
import { Client } from "pg";

const thresholdMs = 500;

async function main() {
  const client = new Client({ connectionString: process.env.PG_URL });
  await client.connect();
  const queriesPath = process.argv[2] || "queries.sql";
  const queries = fs
    .readFileSync(queriesPath, "utf8")
    .split(";")
    .map((q) => q.trim())
    .filter(Boolean);
  const offenders: string[] = [];
  for (const q of queries) {
    const res = await client.query(`EXPLAIN ANALYZE ${q}`);
    const timingLine = res.rows[res.rows.length - 1]["QUERY PLAN"] as string;
    const match = timingLine.match(/([0-9.]+) ms/);
    const duration = match ? parseFloat(match[1]) : 0;
    if (duration > thresholdMs) {
      offenders.push(`${q.substring(0, 120)}... took ${duration}ms`);
    }
  }
  await client.end();
  if (offenders.length) {
    console.error("Queries exceeding threshold:", offenders);
    process.exit(1);
  }
  console.log("All queries within threshold");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
