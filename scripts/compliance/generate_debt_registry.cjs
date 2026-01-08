const fs = require("fs");
const path = require("path");
const { scanCodebase } = require("./debt-lib.cjs");

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, "debt/registry.json");

function main() {
  console.log("Generating Debt Registry...");
  const allDebt = scanCodebase(ROOT_DIR);

  allDebt.sort((a, b) => a.id.localeCompare(b.id));

  const registry = {
    schema_version: "1.0",
    debt: allDebt,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(registry, null, 2));
  console.log(`Wrote ${allDebt.length} debt entries to ${OUTPUT_FILE}`);
}

main();
