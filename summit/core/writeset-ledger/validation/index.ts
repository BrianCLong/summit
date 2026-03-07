import type { WriteSet } from "../materializers/materializeViews";
import { validateAgainstSchema } from "./ajv";
import { buildRejectionReport } from "./rejectionReport";
import { validateLedgerSemanticRules } from "./semanticValidators";

export function validateWriteSets(writesets: WriteSet[]) {
  const schemaIssues = writesets.flatMap((ws) => {
    const result = validateAgainstSchema<WriteSet>("writeset.schema.json", ws);
    return result.issues.map((issue) => ({
      ...issue,
      writeset_id: ws.writeset_id,
    }));
  });

  const semantic = validateLedgerSemanticRules(writesets);

  const report = buildRejectionReport({
    writesets,
    schemaIssues,
    semanticIssues: semantic.issues,
  });

  return {
    ok: report.accepted,
    report,
  };
}
