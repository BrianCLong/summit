#!/usr/bin/env node
import { Command } from "commander";
import { verifyManifest } from "./verify.js";
import { generateManifest } from "./generate.js";
import path from "path";

const program = new Command();

program
  .command("verify <manifestPath> <exportDir>")
  .description("Verify the integrity of an export manifest and its associated files.")
  .action(async (manifestPath, exportDir) => {
    const result = await verifyManifest(path.resolve(manifestPath), path.resolve(exportDir));
    if (result.success) {
      console.log("Manifest verification successful!");
      process.exit(0);
    } else {
      console.error("Manifest verification failed:");
      result.errors.forEach((error) => console.error(`- ${error}`));
      process.exit(1);
    }
  });

program
  .command("generate <exportDir>")
  .description("Generate a manifest for the given directory.")
  .option("--metadata <json>", "Metadata to include in the manifest, as a JSON string.")
  .option("--lineage <json>", "Lineage data to include in the manifest, as a JSON string.")
  .action(async (exportDir, options) => {
    try {
      const metadata = options.metadata ? JSON.parse(options.metadata) : {};
      const lineage = options.lineage ? JSON.parse(options.lineage) : [];
      const manifest = await generateManifest(path.resolve(exportDir), { metadata, lineage });
      console.log("Manifest generated successfully at", path.join(exportDir, "manifest.json"));
      console.log(JSON.stringify(manifest, null, 2));
      process.exit(0);
    } catch (error) {
      console.error("Failed to generate manifest:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
