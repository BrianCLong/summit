#!/usr/bin/env node

// Simple CLI to ingest OSINT events from CSV into correlateThreats mutation
// Usage: node scripts/batch-correlate-osint.js <csvPath> [endpoint]

const { readFileSync } = require("fs");

const [, , csvPath, endpointArg] = process.argv;

if (!csvPath) {
  console.error(
    "Usage: node scripts/batch-correlate-osint.js <csvPath> [endpoint]",
  );
  process.exit(1);
}

const endpoint =
  endpointArg ||
  process.env.GRAPHQL_ENDPOINT ||
  "http://localhost:4000/graphql";

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return headers.reduce((acc, header, idx) => {
        acc[header] = values[idx];
        return acc;
      }, {});
    });
}

async function validateSchema(url) {
  const introspectionQuery =
    "query { __schema { mutationType { fields { name } } } }";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: introspectionQuery }),
  });
  const json = await res.json();
  const fields =
    json.data?.__schema?.mutationType?.fields?.map((f) => f.name) || [];
  if (!fields.includes("correlateThreats")) {
    throw new Error("correlateThreats mutation not found in schema");
  }
}

async function sendMutation(record) {
  const query =
    "mutation ($osintInput: JSON!) { correlateThreats(osintInput: $osintInput) { prioritized_map confidence note } }";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { osintInput: record } }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors));
  } else {
    console.log(JSON.stringify(json.data));
  }
}

async function main() {
  const csvText = readFileSync(csvPath, "utf8");
  const records = parseCsv(csvText);

  try {
    await validateSchema(endpoint);
  } catch (err) {
    console.error("Schema validation failed:", err.message);
    process.exit(1);
  }

  for (const record of records) {
    await sendMutation(record);
  }
}

main();
