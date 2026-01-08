import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { signManifest, verifyManifest, verifyManifestSignature } from "./index.js";

const printHelp = () => {
  console.log(
    `Usage: ig-manifest verify <bundlePath> [--json]\n\nCommands:\n  verify <bundlePath>    Validate manifest integrity\n  sign <bundlePath>      Sign manifest bundle\n\nOptions:\n  --json                 Output machine-readable JSON report\n  --signature <path>     Signature file (default: signature.json)\n  --public-key <path>    Public key PEM for verification\n  --private-key <path>   Private key PEM for signing\n  --key-id <id>          Signer key identifier\n  --output <path>        Output signature file (default: signature.json)\n`
  );
};

export const runCli = async () => {
  const [, , command, bundlePath, ...rest] = process.argv;
  const asJson = rest.includes("--json");
  const getArgValue = (flag) => {
    const index = rest.indexOf(flag);
    if (index === -1) {
      return undefined;
    }
    return rest[index + 1];
  };

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (!bundlePath || !["verify", "sign"].includes(command)) {
    console.error("Invalid arguments.");
    printHelp();
    process.exitCode = 1;
    return;
  }

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
      const manifestRaw = await fs.promises.readFile(
        path.join(bundlePath, "manifest.json"),
        "utf8"
      );
      const manifest = JSON.parse(manifestRaw);
      const signatureFile = signManifest(manifest, {
        privateKeyPem: await fs.promises.readFile(privateKeyPath, "utf8"),
        publicKeyPem: publicKeyPath ? await fs.promises.readFile(publicKeyPath, "utf8") : undefined,
        keyId,
      });
      const output = path.isAbsolute(outputPath) ? outputPath : path.join(bundlePath, outputPath);
      await fs.promises.writeFile(output, JSON.stringify(signatureFile, null, 2));
      console.log(`✔ Signature written to ${output}`);
      process.exitCode = 0;
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

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Manifest version: ${report.manifestVersion}`);
      console.log(`Checked files: ${report.checkedFiles}`);
      console.log(report.valid ? "Status: OK" : "Status: FAILED");
      if (report.signature) {
        console.log(`Signature: ${report.signature.valid ? "valid" : "invalid"}`);
      }
      if (report.issues.length > 0) {
        console.log("\nIssues:");
        for (const issue of report.issues) {
          console.log(`- [${issue.code}] ${issue.message}`);
        }
      }
    }
    process.exitCode = report.valid ? 0 : 1;
  } catch (error) {
    console.error("Verification failed:", error);
    process.exitCode = 1;
  }
};

const invokedDirectly = process.argv[1]?.includes("ig-manifest") ?? false;

if (invokedDirectly) {
  runCli();
}
