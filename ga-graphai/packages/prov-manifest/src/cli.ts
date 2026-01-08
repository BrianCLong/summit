#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { signManifest, verifyManifest, verifyManifestSignature } from "./index.js";
import { MANIFEST_VERSION } from "./schema.js";

function printHelp() {
  console.log(`ig-manifest v${MANIFEST_VERSION}`);
  console.log("Usage: ig-manifest verify <bundlePath> [--json]");
  console.log("Commands:");
  console.log("  verify   Validate a manifest bundle");
  console.log("  sign     Sign a manifest bundle");
  console.log("Options:");
  console.log("  --json   Output a JSON report");
  console.log("  --signature <path>   Signature file (default: signature.json)");
  console.log("  --public-key <path>  Public key PEM for verification");
  console.log("  --private-key <path> Private key PEM for signing");
  console.log("  --key-id <id>        Signer key identifier");
  console.log("  --output <path>      Output signature file (default: signature.json)");
  console.log("  --help   Show this help message");
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const [command, bundlePath, ...rest] = args;
  if (!bundlePath || !["verify", "sign"].includes(command)) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const jsonOutput = rest.includes("--json");
  const getArgValue = (flag: string) => {
    const index = rest.indexOf(flag);
    if (index === -1) {
      return undefined;
    }
    return rest[index + 1];
  };

  try {
    if (command === "sign") {
      const privateKeyPath = getArgValue("--private-key");
      const keyId = getArgValue("--key-id");
      const outputPath = getArgValue("--output") ?? "signature.json";
      const publicKeyPath = getArgValue("--public-key");
      if (!privateKeyPath || !keyId) {
        console.error("sign requires --private-key and --key-id");
        process.exitCode = 1;
        return;
      }
      const manifestPath = path.join(bundlePath, "manifest.json");
      const manifestRaw = await fs.promises.readFile(manifestPath, "utf8");
      const manifest = JSON.parse(manifestRaw);
      const signatureFile = signManifest(manifest, {
        privateKeyPem: await fs.promises.readFile(privateKeyPath, "utf8"),
        publicKeyPem: publicKeyPath ? await fs.promises.readFile(publicKeyPath, "utf8") : undefined,
        keyId,
      });
      const output = path.isAbsolute(outputPath) ? outputPath : path.join(bundlePath, outputPath);
      await fs.promises.writeFile(output, JSON.stringify(signatureFile, null, 2));
      console.log(`✔ Signature written to ${output}`);
      return;
    }

    const signaturePath = getArgValue("--signature");
    const publicKeyPath = getArgValue("--public-key");
    const report = await verifyManifest(bundlePath);

    if (publicKeyPath) {
      const manifestRaw = await fs.promises.readFile(
        path.join(bundlePath, "manifest.json"),
        "utf8"
      );
      const manifest = JSON.parse(manifestRaw);
      const signatureFilePath = signaturePath ?? path.join(bundlePath, "signature.json");
      const signatureRaw = await fs.promises.readFile(signatureFilePath, "utf8");
      const signatureFile = JSON.parse(signatureRaw);
      const publicKeyPem = await fs.promises.readFile(publicKeyPath, "utf8");
      const signatureCheck = verifyManifestSignature(manifest, signatureFile, publicKeyPem);
      report.signature = {
        valid: signatureCheck.valid,
        reason: signatureCheck.reason,
        keyId: signatureFile.signature?.keyId,
        algorithm: signatureFile.signature?.algorithm,
        signedAt: signatureFile.signature?.signedAt,
        manifestHash: signatureFile.manifestHash,
      };
      if (!signatureCheck.valid) {
        report.valid = false;
      }
    }

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else if (report.valid) {
      console.log(`✔ Manifest valid (version ${report.manifestVersion ?? "unknown"})`);
      console.log(`Files checked: ${report.filesChecked}, transforms: ${report.transformsChecked}`);
      if (report.signature) {
        console.log(`Signature: ${report.signature.valid ? "valid" : "invalid"}`);
      }
    } else {
      console.error("Manifest verification failed:");
      report.issues.forEach((issue) => {
        console.error(`- [${issue.code}] ${issue.message}${issue.path ? ` (${issue.path})` : ""}`);
      });
      if (report.signature && !report.signature.valid && report.signature.reason) {
        console.error(`- [SIGNATURE] ${report.signature.reason}`);
      }
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Unexpected error while verifying manifest", error);
    process.exitCode = 1;
  }
}

run();
