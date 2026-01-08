import { createHash, randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { Evidence, Claim, Transformation, Manifest, LedgerConfig } from "./types";

export class Ledger {
  private config: LedgerConfig;
  private evidenceStore: Map<string, Evidence> = new Map();
  private claimStore: Map<string, Claim> = new Map();
  private transformStore: Map<string, Transformation> = new Map();

  constructor(config: LedgerConfig) {
    this.config = config;
    if (this.config.enabled) {
      this.init();
      // In a real implementation, we would load existing data here
      // For now, we start fresh or append
    }
  }

  private init() {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }
  }

  private append(filename: string, data: any) {
    if (!this.config.enabled) {
      return;
    }
    const filePath = path.join(this.config.dataDir, filename);
    fs.appendFileSync(filePath, `${JSON.stringify(data)}\n`);
  }

  public registerEvidence(evidence: Omit<Evidence, "id" | "timestamp" | "hash">): Evidence {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    // Hash complete record
    const contentToHash = JSON.stringify({
      id,
      contentHash: evidence.contentHash,
      licenseId: evidence.licenseId,
      source: evidence.source,
      transforms: evidence.transforms,
      timestamp,
      metadata: evidence.metadata,
    });
    const hash = createHash("sha256").update(contentToHash).digest("hex");

    const record: Evidence = {
      ...evidence,
      id,
      timestamp,
      hash,
    };
    this.evidenceStore.set(id, record);
    this.append("evidence.jsonl", record);
    return record;
  }

  public registerTransformation(
    transform: Omit<Transformation, "id" | "timestamp" | "hash">
  ): Transformation {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    // Hash complete record
    const contentToHash = JSON.stringify({
      id,
      tool: transform.tool,
      version: transform.version,
      params: transform.params,
      inputHash: transform.inputHash,
      outputHash: transform.outputHash,
      timestamp,
    });
    const hash = createHash("sha256").update(contentToHash).digest("hex");

    const record: Transformation = {
      ...transform,
      id,
      timestamp,
      hash,
    };
    this.transformStore.set(id, record);
    this.append("transforms.jsonl", record);
    return record;
  }

  public createClaim(claim: Omit<Claim, "id" | "timestamp" | "hash">): Claim {
    const id = randomUUID();
    const hashContent = JSON.stringify({
      text: claim.text,
      evidenceIds: claim.evidenceIds,
      transformChainIds: claim.transformChainIds,
    });
    const hash = createHash("sha256").update(hashContent).digest("hex");

    const record: Claim = {
      ...claim,
      id,
      timestamp: new Date().toISOString(),
      hash,
    };
    this.claimStore.set(id, record);
    this.append("claims.jsonl", record);
    return record;
  }

  public getClaim(id: string): Claim | undefined {
    return this.claimStore.get(id);
  }

  public getEvidence(id: string): Evidence | undefined {
    return this.evidenceStore.get(id);
  }

  public generateManifest(claimIds: string[]): Manifest {
    const claims: Claim[] = [];
    const evidenceSet = new Set<string>();
    const transformSet = new Set<string>();

    for (const id of claimIds) {
      const claim = this.claimStore.get(id);
      if (claim) {
        claims.push(claim);
        claim.evidenceIds.forEach((eid) => evidenceSet.add(eid));
        claim.transformChainIds.forEach((tid) => transformSet.add(tid));
      }
    }

    const evidence: Evidence[] = [];
    evidenceSet.forEach((eid) => {
      const e = this.evidenceStore.get(eid);
      if (e) {
        evidence.push(e);
      }
    });

    const transformations: Transformation[] = [];
    transformSet.forEach((tid) => {
      const t = this.transformStore.get(tid);
      if (t) {
        transformations.push(t);
      }
    });

    // Compute Merkle Root
    const allHashes = [
      ...claims.map((c) => c.hash),
      ...evidence.map((e) => e.hash),
      ...transformations.map((t) => t.hash),
    ].sort();

    const merkleRoot = this.computeMerkleRoot(allHashes);

    const manifest: Manifest = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      generatedBy: "prov-ledger",
      merkleRoot,
      claims,
      evidence,
      transformations,
    };

    // Stub signature
    const manifestHash = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    manifest.signature = `stub-sig-${manifestHash}`;

    return manifest;
  }

  private computeMerkleRoot(hashes: string[]): string {
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
