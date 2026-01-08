#!/usr/bin/env node

import { CasePackBuilder } from "../../intelgraph/server/src/modules/casepack/casepack.builder.js";
import { program } from "commander";
import * as path from "path";
import * as fs from "fs";

program
  .option("--case <id>", "Case ID to pack")
  .option("--scope <file>", "Path to a JSON file defining the scope")
  .option("--out <dir>", "Output directory for the case pack")
  .parse(process.argv);

const options = program.opts();

if (!options.case || !options.scope || !options.out) {
  console.error("Missing required options: --case, --scope, --out");
  process.exit(1);
}

const scope = JSON.parse(fs.readFileSync(options.scope, "utf-8"));
const builder = new CasePackBuilder();

builder
  .build(scope, { total_bytes: 10485760, max_objects: 1000 }, options.out)
  .then((manifest) => {
    console.log(`Case pack built successfully: ${manifest.pack_id}`);
  })
  .catch((err) => {
    console.error(`Error building case pack: ${err.message}`);
    process.exit(1);
  });
