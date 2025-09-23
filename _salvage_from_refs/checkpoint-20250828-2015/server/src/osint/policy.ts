import { ForbiddenError } from "apollo-server-errors";

export type LicenseRule = {
  id: string;
  name: string;
  termsUrl?: string;
  allowIngest: boolean;
  allowDerivative?: boolean;
  allowExport?: boolean;
};

export function assertIngestAllowed(rule: LicenseRule) {
  if (!rule.allowIngest) {
    throw new ForbiddenError(
      "Ingest blocked by license: source terms disallow collection."
    );
  }
}

export function assertExportAllowed(rule: LicenseRule) {
  if (rule.allowExport === false) {
    throw new ForbiddenError(
      "Export blocked by license. Request an exception via ombuds workflow."
    );
  }
}

