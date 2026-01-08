import { CasePackManifest } from "./casepack.types";
import { CasePackSigner } from "./casepack.signer";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export class CasePackVerifier {
  private signer = new CasePackSigner();

  /**
   * Verifies the integrity of the entire case pack.
   */
  public async verify(
    packDir: string,
    publicKey: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const manifestPath = path.join(packDir, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      return { valid: false, errors: ["manifest.json not found"] };
    }

    const manifest: CasePackManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // 1. Verify manifest hash and signature
    const manifestHash = this.signer.createManifestHash(manifest);
    const signaturePath = path.join(packDir, "signatures", "manifest.sig");

    if (!fs.existsSync(signaturePath)) {
      errors.push("manifest.sig not found");
    } else {
      const signature = fs.readFileSync(signaturePath, "utf-8");
      if (!this.verifySignature(manifestHash, signature, publicKey)) {
        errors.push("Invalid manifest signature");
      }
    }

    // 2. Verify file checksums
    const checksumsPath = path.join(packDir, "hashes", "checksums.sha256");
    if (!fs.existsSync(checksumsPath)) {
      errors.push("checksums.sha256 not found");
    } else {
      const checksums = this.parseChecksums(fs.readFileSync(checksumsPath, "utf-8"));
      for (const file of manifest.inventory.objects) {
        const filePath = path.join(packDir, file.path);
        if (!fs.existsSync(filePath)) {
          errors.push(`File not found: ${file.path}`);
          continue;
        }
        const fileHash = this.calculateFileHash(filePath);
        if (fileHash !== checksums[file.path]) {
          errors.push(`Checksum mismatch for ${file.path}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private verifySignature(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify("SHA256");
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, "hex");
  }

  private calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    return hash.digest("hex");
  }

  private parseChecksums(checksumsContent: string): Record<string, string> {
    const checksums: Record<string, string> = {};
    const lines = checksumsContent.split("\n");
    for (const line of lines) {
      const [hash, path] = line.split(/\s+/);
      if (hash && path) {
        checksums[path] = hash;
      }
    }
    return checksums;
  }
}
