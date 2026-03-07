import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../types/writeset.schema.json";
import type { WriteSet } from "../types/writeset.types";
import type { RejectionReport } from "../../../summit-core/src/writeArtifacts/rejectionReport.types";
import { makeAcceptedReport, makeRejectedReport } from "../../../summit-core/src/writeArtifacts/writeArtifacts";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile<WriteSet>(schema);

export function validateWriteSet(writeset: WriteSet): RejectionReport {
  const ok = validate(writeset);
  if (ok) {
    return makeAcceptedReport(writeset.writeset_id, writeset.system_time);
  }

  return makeRejectedReport(
    writeset.writeset_id,
    writeset.system_time,
    (validate.errors ?? []).map((err) => ({
      code: "SCHEMA_VALIDATION_FAILED" as const,
      message: err.message ?? "Schema validation failed",
      path: err.instancePath || undefined,
    }))
  );
}
