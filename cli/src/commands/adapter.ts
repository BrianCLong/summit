import { Command } from "commander";
import fs from "node:fs";
import ora from "ora";
import {
  BundleValidationError,
  buildAdapterBundle,
  verifyAdapterBundle,
  type AdapterCompatibilityMatrix,
  type AdapterManifest,
} from "@intelgraph/adapter-sdk";
import { handleError } from "../utils/errors.js";
import { error, success } from "../utils/output.js";

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function registerAdapterCommands(program: Command): void {
  const adapter = program
    .command("adapter")
    .description("Adapter packaging and verification utilities");

  adapter
    .command("package")
    .description("Build, attest, and sign an adapter bundle")
    .requiredOption("-s, --source <path>", "Adapter payload directory to include in the bundle")
    .requiredOption("-m, --manifest <path>", "Adapter manifest JSON")
    .requiredOption("-c, --config-schema <path>", "Adapter config schema JSON")
    .requiredOption("--compatibility <path>", "Compatibility matrix JSON")
    .requiredOption("-k, --key <path>", "Private key for cosign signing")
    .option("-o, --output <dir>", "Output directory for bundle artifacts", "dist")
    .option("--sbom <path>", "Existing SBOM JSON to embed (optional)")
    .option("--slsa <path>", "Existing SLSA attestation JSON to embed (optional)")
    .option("--cosign <binary>", "Cosign binary to use", "cosign")
    .action(async (options) => {
      const spinner = ora("Building adapter bundle...").start();
      try {
        const manifest = readJsonFile<AdapterManifest>(options.manifest);
        const compatibility = readJsonFile<AdapterCompatibilityMatrix>(options.compatibility);

        const result = await buildAdapterBundle({
          manifest,
          compatibility,
          sourceDir: options.source,
          configSchemaPath: options.configSchema,
          outputDir: options.output,
          sbomPath: options.sbom,
          slsaPath: options.slsa,
          cosignBinary: options.cosign,
          signingKeyPath: options.key,
        });

        spinner.succeed("Bundle created");

        if (program.opts().json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          success("Adapter bundle packaged and signed");
          console.log(`  Bundle: ${result.bundlePath}`);
          console.log(`  Signature: ${result.signaturePath}`);
          console.log(`  Digest: ${result.bundleDigest}`);
        }
      } catch (err: unknown) {
        spinner.fail("Failed to build bundle");
        if (err instanceof BundleValidationError) {
          error(err.message);
          return;
        }
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  adapter
    .command("verify <bundle>")
    .description("Verify an adapter bundle signature and compatibility")
    .requiredOption("-s, --signature <path>", "Cosign signature file")
    .requiredOption("-k, --key <path>", "Cosign public key")
    .requiredOption("--sdk-version <version>", "Expected adapter SDK version range")
    .option("--cosign <binary>", "Cosign binary to use", "cosign")
    .option("--allow-prerelease", "Allow prerelease versions when evaluating ranges", false)
    .action(async (bundle: string, options) => {
      const spinner = ora("Verifying adapter bundle...").start();
      try {
        const result = await verifyAdapterBundle({
          bundlePath: bundle,
          signaturePath: options.signature,
          publicKeyPath: options.key,
          expectedSdkVersion: options.sdkVersion,
          cosignBinary: options.cosign,
          allowPrerelease: options.allowPrerelease,
        });

        spinner.succeed("Bundle verified");

        if (program.opts().json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          success(`Signature validated for ${result.manifest.name}@${result.manifest.version}`);
          for (const line of result.diagnostics) {
            console.log(`  • ${line}`);
          }
        }
      } catch (err: unknown) {
        spinner.fail("Bundle verification failed");
        if (err instanceof BundleValidationError) {
          error(err.message);
          return;
        }
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    });
}
