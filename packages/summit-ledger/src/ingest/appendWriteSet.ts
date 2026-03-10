import crypto from "node:crypto";
import type { WriteSet } from "../types/writeset.types";
import type { LedgerDbHandle } from "../db/initLedgerDb";
import type { RejectionReport } from "../../../summit-core/src/writeArtifacts/rejectionReport.types";
import { validateWriteSet } from "./validateWriteSet";

export interface AppendWriteSetResult {
  report: RejectionReport;
  appended: boolean;
  sha256?: string;
}

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stableSort(v)])
    );
  }
  return value;
}

function canonicalizeWriteSet(writeset: WriteSet): string {
  return JSON.stringify(stableSort(writeset));
}

export async function appendWriteSet(
  db: LedgerDbHandle,
  writeset: WriteSet
): Promise<AppendWriteSetResult> {
  const report = validateWriteSet(writeset);
  if (!report.accepted) {
    return {
      report,
      appended: false,
    };
  }

  const canonicalJson = canonicalizeWriteSet(writeset);
  const sha256 = crypto.createHash("sha256").update(canonicalJson).digest("hex");

  await db.insertWriteSet({
    writeset_id: writeset.writeset_id,
    system_time: writeset.system_time,
    source: writeset.source,
    actor: null,
    sha256,
    json: canonicalJson,
  });

  return {
    report,
    appended: true,
    sha256,
  };
}
