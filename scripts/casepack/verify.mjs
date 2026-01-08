#!/usr/bin/env node

import { CasePackVerifier } from "../../intelgraph/server/src/modules/casepack/casepack.verifier.js";
import { program } from "commander";
import * as fs from "fs";
import * as path from "path";

program
  .option("--path <packDir>", "Path to the case pack directory")
  .option("--offline", "Perform offline verification", false)
  .parse(process.argv);

const options = program.opts();

if (!options.path) {
  console.error("Missing required option: --path");
  process.exit(1);
}

const verifier = new CasePackVerifier();
const publicKeyPath = path.join(options.path, "signatures", "public-key.pem");

if (!fs.existsSync(publicKeyPath)) {
  console.error("Public key not found in case pack");
  process.exit(1);
}

const publicKey = fs.readFileSync(publicKeyPath, "utf-8");

verifier
  .verify(options.path, publicKey)
  .then(({ valid, errors }) => {
    if (valid) {
      console.log("Case pack verified successfully.");
    } else {
      console.error("Case pack verification failed:");
      errors.forEach((err) => console.error(`- ${err}`));
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error(`An unexpected error occurred: ${err.message}`);
    process.exit(1);
  });
