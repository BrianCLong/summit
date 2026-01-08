import { createHash } from "crypto";
import { Manifest } from "./types";

export class Verifier {
  public static verifyManifest(manifest: Manifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Recompute Merkle Root
    const allHashes = [
      ...manifest.claims.map((c) => c.hash),
      ...manifest.evidence.map((e) => e.hash),
      ...manifest.transformations.map((t) => t.hash),
    ].sort();

    const computedRoot = this.computeMerkleRoot(allHashes);
    if (computedRoot !== manifest.merkleRoot) {
      errors.push(
        `Merkle root mismatch. Expected: ${manifest.merkleRoot}, Computed: ${computedRoot}`
      );
    }

    // Verify Evidence hashes
    for (const e of manifest.evidence) {
      const contentToHash = JSON.stringify({
        id: e.id,
        contentHash: e.contentHash,
        licenseId: e.licenseId,
        source: e.source,
        transforms: e.transforms,
        timestamp: e.timestamp,
        metadata: e.metadata,
      });
      const computed = createHash("sha256").update(contentToHash).digest("hex");
      if (computed !== e.hash) {
        errors.push(`Evidence hash mismatch for ${e.id}`);
      }
    }

    // Verify Transformation hashes
    for (const t of manifest.transformations) {
      const contentToHash = JSON.stringify({
        id: t.id,
        tool: t.tool,
        version: t.version,
        params: t.params,
        inputHash: t.inputHash,
        outputHash: t.outputHash,
        timestamp: t.timestamp,
      });
      const computed = createHash("sha256").update(contentToHash).digest("hex");
      if (computed !== t.hash) {
        errors.push(`Transformation hash mismatch for ${t.id}`);
      }
    }

    // Verify Claims
    for (const claim of manifest.claims) {
      const hashContent = JSON.stringify({
        text: claim.text,
        evidenceIds: claim.evidenceIds,
        transformChainIds: claim.transformChainIds,
      });
      const computedHash = createHash("sha256").update(hashContent).digest("hex");
      if (computedHash !== claim.hash) {
        errors.push(`Claim hash mismatch for ${claim.id}`);
      }
    }

    // Verify signature
    if (!manifest.signature) {
      errors.push("Manifest signature missing");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return "";
    }
    let current = hashes;
    while (current.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        if (left === undefined) {
          continue;
        }

        if (i + 1 < current.length) {
          const right = current[i + 1];
          if (right === undefined) {
            next.push(left);
            continue;
          }
          const combined = left + right;
          next.push(createHash("sha256").update(combined).digest("hex"));
        } else {
          next.push(left);
        }
      }
      current = next;
    }
    return current[0] || "";
  }
}
