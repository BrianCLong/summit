#!/usr/bin/env node
import { Command } from "commander";
import { promises as fs } from "node:fs";
import { verifyAttestation } from "../attestation.js";
import { loadPolicy, hashPolicy } from "../policy.js";
import type { ResidencyAttestation, ResidencyPolicy } from "../types.js";
import { RaewrSDK } from "../sdk.js";

interface KeyEnvelope {
  publicKey: string;
}

async function readJson<T>(path: string): Promise<T> {
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw) as T;
}

const program = new Command();
program
  .name("raewr-verify")
  .description("Verify Residency-Attested Edge WASM Runner attestations")
  .argument("<attestation>", "Path to a residency attestation JSON file")
  .option("--public-key <path>", "Path to a JSON file containing the expected public key")
  .option("--policy <path>", "Path to the residency policy JSON to validate policy hash")
  .option(
    "--chain <path>",
    "Optional path to a JSON file with an array of attestations to verify deterministic chain digests"
  )
  .action(async (attestationPath: string, options: { publicKey?: string; policy?: string; chain?: string }) => {
    try {
      const attestation = await readJson<ResidencyAttestation>(attestationPath);
      let policy: ResidencyPolicy | undefined;

      if (options.publicKey) {
        const envelope = await readJson<KeyEnvelope>(options.publicKey);
        if (envelope.publicKey !== attestation.publicKey) {
          throw new Error("Attestation public key does not match the provided verifier key.");
        }
      }

      if (options.policy) {
        policy = await loadPolicy(options.policy);
        const expectedHash = hashPolicy(policy);
        if (expectedHash !== attestation.policyHash) {
          throw new Error(`Policy hash mismatch. Expected ${expectedHash}, received ${attestation.policyHash}.`);
        }
      }

      if (!verifyAttestation(attestation)) {
        throw new Error("Signature verification failed.");
      }

      if (options.chain) {
        const chain = await readJson<ResidencyAttestation[]>(options.chain);
        const { valid, failures } = RaewrSDK.verifyChain(chain, {
          minimumLength: policy?.minimumChainLength,
        });
        if (!valid) {
          throw new Error(`Chain verification failed:\n${failures.join("\n")}`);
        }
      }

      process.stdout.write("Attestation verified successfully.\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Verification failed: ${message}\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
