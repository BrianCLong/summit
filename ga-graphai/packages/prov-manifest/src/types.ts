export type VerificationIssueCode =
  | 'MISSING_MANIFEST'
  | 'SCHEMA_INVALID'
  | 'MISSING_FILE'
  | 'HASH_MISMATCH'
  | 'PATH_TRAVERSAL'
  | 'TRANSFORM_BROKEN'
  | 'EVIDENCE_MISSING';

export interface VerificationIssue {
  code: VerificationIssueCode;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface VerificationReport {
  bundlePath: string;
  manifestPath: string;
  manifestVersion?: string;
  valid: boolean;
  issues: VerificationIssue[];
  filesChecked: number;
  transformsChecked: number;
}

export interface ManifestFileEntry {
  id: string;
  path: string;
  mediaType?: string;
  role?: string;
  sha256: string;
  transforms?: string[];
  evidence?: string[];
}

export interface ManifestTransform {
  id: string;
  description?: string;
  step: number;
  inputId: string;
  outputId: string;
  evidenceIds?: string[];
}

export interface Manifest {
  manifestVersion: string;
  bundleId?: string;
  createdAt: string;
  documents: ManifestFileEntry[];
  exhibits?: ManifestFileEntry[];
  evidence?: ManifestFileEntry[];
  transforms?: ManifestTransform[];
}
