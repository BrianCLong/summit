import { CasePackManifest, CasePackScope, CasePackBudgets } from "./casepack.types";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export class CasePackBuilder {
  /**
   * Builds a case pack based on the given scope and budgets.
   */
  public async build(
    scope: CasePackScope,
    budgets: CasePackBudgets,
    outDir: string
  ): Promise<CasePackManifest> {
    const packId = uuidv4();
    const caseId = "test-case"; // Placeholder
    const tenantId = "test-tenant"; // Placeholder

    const manifest: CasePackManifest = {
      pack_id: packId,
      case_id: caseId,
      tenant_id: tenantId,
      revision: 1,
      created_at: new Date().toISOString(),
      scope,
      inventory: { objects: [], attachments: [] },
      budgets,
      actuals: { total_bytes: 0, object_counts: {} },
      provenance: { git_sha: "dev", build_id: "local" },
      signature: {
        algorithm: "SHA256withRSA",
        key_id: "test-key",
        canonicalization: "JCS",
      },
    };

    // Placeholder for fetching and adding objects
    this.addObjects(manifest, outDir);

    // Create the output directory
    fs.mkdirSync(outDir, { recursive: true });

    // Write the manifest
    fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    return manifest;
  }

  private addObjects(manifest: CasePackManifest, outDir: string) {
    // Placeholder: create a dummy object
    const dummyObject = { id: "test-object", data: "hello world" };
    const objectPath = path.join("objects", "dummy", `${dummyObject.id}.json`);
    const fullPath = path.join(outDir, objectPath);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(dummyObject));

    const fileBuffer = fs.readFileSync(fullPath);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);

    manifest.inventory.objects.push({
      path: objectPath,
      sha256: hash.digest("hex"),
      bytes: fileBuffer.byteLength,
    });

    manifest.actuals.total_bytes += fileBuffer.byteLength;
    manifest.actuals.object_counts["dummy"] = 1;
  }
}
