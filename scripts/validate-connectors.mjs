import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Ajv from "ajv/dist/2020.js";

const schema = JSON.parse(
  fs.readFileSync("schemas/connectors/connector-manifest.schema.json", "utf8")
);

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const roots = [
  "connectors/examples/whois/connector.yaml",
  "connectors/examples/crtsh/connector.yaml"
];

let failed = false;

for (const file of roots) {
  const data = YAML.parse(fs.readFileSync(file, "utf8"));
  const ok = validate(data);
  if (!ok) {
    failed = true;
    console.error(`INVALID: ${file}`);
    console.error(validate.errors);
  } else {
    console.log(`VALID: ${file}`);
  }
}

if (failed) process.exit(1);
