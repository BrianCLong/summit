import { readFile } from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

async function loadJson(relativePath: string): Promise<unknown> {
  const raw = await readFile(path.join(process.cwd(), relativePath), "utf8");
  return JSON.parse(raw) as unknown;
}

describe("evidence schemas", () => {
  const cases = [
    ["index", "docs/api/schemas/evidence/index.schema.json"],
    ["report", "docs/api/schemas/evidence/report.schema.json"],
    ["metrics", "docs/api/schemas/evidence/metrics.schema.json"],
    ["stamp", "docs/api/schemas/evidence/stamp.schema.json"],
  ] as const;

  it.each(cases)("accepts positive fixture for %s", async (_name, schemaPath) => {
    const schema = await loadJson(schemaPath);
    const fixture = await loadJson(
      `tests/fixtures/evidence/positive/${path.basename(schemaPath).replace(".schema", "")}`
    );
    const validate = ajv.compile(schema);
    expect(validate(fixture)).toBe(true);
  });

  it.each(cases)("rejects negative fixture for %s", async (_name, schemaPath) => {
    const schema = await loadJson(schemaPath);
    const fixture = await loadJson(
      `tests/fixtures/evidence/negative/${path.basename(schemaPath).replace(".schema", "")}`
    );
    const validate = ajv.compile(schema);
    expect(validate(fixture)).toBe(false);
  });
});
