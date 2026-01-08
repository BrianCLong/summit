const fs = require("fs");
const path = require("path");

const targets = [
  { path: "schemas/runbook.schema.json", system: "maestro" },
  { path: "schemas/workflow.schema.json", system: "maestro" },
  { path: "server/data-pipelines/contracts/contacts_v1.json", system: "intelgraph" },
  { path: "server/data-pipelines/contracts/twitter_v1.json", system: "intelgraph" },
  { path: "schemas/data-spine/events/base-envelope.schema.json", system: "companyos" },
];

const readJson = (targetPath) => {
  const fullPath = path.join(process.cwd(), targetPath);
  const raw = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(raw);
};

const extractTags = (doc) => {
  if (Array.isArray(doc?.metadata?.tags)) {
    return doc.metadata.tags;
  }

  if (Array.isArray(doc["x-data-tags"])) {
    return doc["x-data-tags"];
  }

  if (Array.isArray(doc.data_tags)) {
    return doc.data_tags;
  }

  return [];
};

const payload = {
  paths: targets.map((target) => {
    const doc = readJson(target.path);
    return {
      path: target.path,
      system: target.system,
      tags: extractTags(doc),
    };
  }),
};

process.stdout.write(JSON.stringify(payload, null, 2));
