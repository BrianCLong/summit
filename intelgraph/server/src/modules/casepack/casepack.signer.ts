import { CasePackManifest } from "./casepack.types";
import { canonicalize } from "json-canonicalize";
import * as crypto from "crypto";

export class CasePackSigner {
  /**
   * Creates a canonical hash of the manifest.
   * Excludes volatile fields like `created_at`.
   */
  public createManifestHash(manifest: CasePackManifest): string {
    const manifestToHash = { ...manifest };
    // @ts-ignore
    delete manifestToHash.created_at;

    const canonicalizedManifest = canonicalize(manifestToHash);

    const hash = crypto.createHash("sha256");
    hash.update(canonicalizedManifest);

    return hash.digest("hex");
  }

  /**
   * Signs the manifest hash with a private key.
   * NOTE: This is a placeholder for the actual signing logic.
   */
  public sign(data: string, privateKey: string): string {
    const sign = crypto.createSign("SHA256");
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, "hex");
  }
}
