
export interface BundleFile {
  path: string;
  size: number;
  sha256: string;
}

export interface BundleManifest {
  bundle_id: string;
  evaluator_version: string;
  created_from: string;
  created_at: string;
  files: BundleFile[];
  signing_metadata: {
    algorithm: string;
    key_id: string;
    canonicalization: string;
  };
}
