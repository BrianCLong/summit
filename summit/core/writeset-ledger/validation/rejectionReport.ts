import type { WriteSet } from "../materializers/materializeViews";
import type { SchemaValidationIssue } from "./ajv";
import type { SemanticIssue } from "./semanticValidators";

export interface RejectionReportItem {
  level: "error" | "warning";
  scope: "schema" | "semantic";
  writeset_id?: string;
  claim_id?: string;
  message: string;
  code?: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface RejectionReport {
  accepted: boolean;
  writeset_ids: string[];
  summary: {
    error_count: number;
    warning_count: number;
  };
  items: RejectionReportItem[];
}

export function buildRejectionReport(args: {
  writesets: WriteSet[];
  schemaIssues?: Array<SchemaValidationIssue & { writeset_id?: string }>;
  semanticIssues?: SemanticIssue[];
}): RejectionReport {
  const schemaItems: RejectionReportItem[] = (args.schemaIssues ?? []).map((issue) => ({
    level: "error",
    scope: "schema",
    writeset_id: issue.writeset_id,
    path: issue.instancePath,
    code: issue.keyword,
    message: issue.message,
    details: issue.params,
  }));

  const semanticItems: RejectionReportItem[] = (args.semanticIssues ?? []).map((issue) => ({
    level: issue.severity,
    scope: "semantic",
    writeset_id: issue.writeset_id,
    claim_id: issue.claim_id,
    code: issue.code,
    message: issue.message,
    details: issue.details,
  }));

  const items = [...schemaItems, ...semanticItems];
  const error_count = items.filter((i) => i.level === "error").length;
  const warning_count = items.filter((i) => i.level === "warning").length;

  return {
    accepted: error_count === 0,
    writeset_ids: args.writesets.map((w) => w.writeset_id),
    summary: {
      error_count,
      warning_count,
    },
    items,
  };
}

export function formatRejectionReportMarkdown(report: RejectionReport): string {
  const lines: string[] = [];

  lines.push(`# WriteSet Validation Report`);
  lines.push(``);
  lines.push(`Accepted: **${report.accepted ? "yes" : "no"}**`);
  lines.push(`Errors: **${report.summary.error_count}**`);
  lines.push(`Warnings: **${report.summary.warning_count}**`);
  lines.push(`WriteSets: ${report.writeset_ids.join(", ") || "(none)"}`);
  lines.push(``);

  if (!report.items.length) {
    lines.push(`No validation issues found.`);
    return lines.join("\n");
  }

  lines.push(`## Issues`);
  lines.push(``);

  for (const item of report.items) {
    lines.push(
      `- [${item.level.toUpperCase()}][${item.scope}] ${item.message}` +
        `${item.writeset_id ? ` (writeset=${item.writeset_id})` : ""}` +
        `${item.claim_id ? ` (claim=${item.claim_id})` : ""}` +
        `${item.path ? ` (path=${item.path})` : ""}` +
        `${item.code ? ` (code=${item.code})` : ""}`,
    );
  }

  return lines.join("\n");
}
