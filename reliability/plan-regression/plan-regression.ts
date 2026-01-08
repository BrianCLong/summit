/// <reference types="node" />

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { criticalQueries } from "./critical-queries";
import {
  PlanBaseline,
  PlanBaselineEntry,
  PlanCheckResult,
  PlanDiff,
  PlanSignatureNode,
} from "./types";

const ESTIMATE_TOLERANCE = 0.25; // 25% drift allowed before we flag it
export const DEFAULT_BASELINE_PATH = path.join(
  process.cwd(),
  "reliability",
  "plan-regression",
  "fixtures",
  "postgres-plan-baseline.json"
);

export interface QueryPlanRunner {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export function hashSql(sql: string): string {
  return createHash("sha1").update(sql.replace(/\s+/g, " ").trim()).digest("hex");
}

export function normalizePlanNode(plan: any): PlanSignatureNode {
  const node: PlanSignatureNode = {
    nodeType: plan["Node Type"] ?? "Unknown",
    relationName: plan["Relation Name"],
    indexName: plan["Index Name"],
    joinType: plan["Join Type"],
    estimatedRows: plan["Plan Rows"] ?? plan["Actual Rows"],
    filter: plan["Filter"],
  };

  const children = (plan["Plans"] as any[] | undefined)?.map(normalizePlanNode);
  if (children && children.length > 0) {
    node.children = children;
  }

  return node;
}

export function collectPlanSignature(planPayload: any[]): PlanSignatureNode {
  const root = planPayload?.[0]?.Plan ?? planPayload?.[0];
  if (!root) {
    throw new Error("EXPLAIN payload missing Plan root node");
  }
  return normalizePlanNode(root);
}

function formatPath(node: PlanSignatureNode, parentPath: string): string {
  const relationSuffix = node.relationName ? `:${node.relationName}` : "";
  const pathSegment = `${node.nodeType}${relationSuffix}`;
  return parentPath ? `${parentPath} > ${pathSegment}` : pathSegment;
}

export function comparePlanSignatures(
  baseline: PlanSignatureNode,
  current: PlanSignatureNode,
  parentPath = "",
  diffs: PlanDiff[] = []
): PlanDiff[] {
  const pathLabel = formatPath(current, parentPath);

  const comparableFields: Array<
    Exclude<keyof PlanSignatureNode, "children" | "estimatedRows" | "filter">
  > = ["nodeType", "relationName", "indexName", "joinType"];

  for (const field of comparableFields) {
    if (baseline[field] !== current[field]) {
      diffs.push({
        path: pathLabel,
        field,
        baseline: baseline[field],
        current: current[field],
        message: `${field} changed`,
      });
    }
  }

  if (typeof baseline.estimatedRows === "number" && typeof current.estimatedRows === "number") {
    const delta =
      Math.abs(current.estimatedRows - baseline.estimatedRows) /
      Math.max(baseline.estimatedRows, 1);
    if (delta > ESTIMATE_TOLERANCE) {
      diffs.push({
        path: pathLabel,
        field: "estimatedRows",
        baseline: baseline.estimatedRows,
        current: current.estimatedRows,
        message: `estimatedRows drifted by ${(delta * 100).toFixed(1)}%`,
      });
    }
  }

  const baselineChildren = baseline.children ?? [];
  const currentChildren = current.children ?? [];
  if (baselineChildren.length !== currentChildren.length) {
    diffs.push({
      path: pathLabel,
      field: "children",
      baseline: baselineChildren.length,
      current: currentChildren.length,
      message: "child plan count changed",
    });
  }

  const maxChildren = Math.min(baselineChildren.length, currentChildren.length);
  for (let i = 0; i < maxChildren; i += 1) {
    const baselineChild = baselineChildren[i];
    const currentChild = currentChildren[i];
    if (baselineChild && currentChild) {
      comparePlanSignatures(baselineChild, currentChild, pathLabel, diffs);
    }
  }

  return diffs;
}

export function formatPlanDiffs(queryId: string, sql: string, diffs: PlanDiff[]): string {
  if (diffs.length === 0) {
    return "";
  }

  const header = `Plan regression detected for "${queryId}"`;
  const body = diffs
    .map(
      (d) =>
        `- ${d.path} :: ${d.field} — ${d.message} (baseline: ${String(
          d.baseline ?? "∅"
        )}, current: ${String(d.current ?? "∅")})`
    )
    .join("\n");

  return `${header}\nSQL: ${sql.trim()}\n${body}`;
}

export function loadBaseline(baselinePath = DEFAULT_BASELINE_PATH): PlanBaseline {
  const raw = readFileSync(baselinePath, "utf8");
  return JSON.parse(raw) as PlanBaseline;
}

export async function runExplain(
  pool: QueryPlanRunner,
  sql: string,
  analyze = false
): Promise<PlanSignatureNode> {
  const explainPrefix = analyze
    ? "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)"
    : "EXPLAIN (FORMAT JSON)";
  const { rows } = await pool.query(`${explainPrefix} ${sql}`);
  const planPayload = rows?.[0]?.["QUERY PLAN"];
  if (!planPayload) {
    throw new Error("EXPLAIN returned no plan payload");
  }

  return collectPlanSignature(planPayload);
}

export async function checkPlansAgainstBaseline(options: {
  pool: QueryPlanRunner;
  baselinePath?: string;
  analyze?: boolean;
}): Promise<PlanCheckResult[]> {
  const baseline = loadBaseline(options.baselinePath ?? DEFAULT_BASELINE_PATH);
  const baselineById = new Map<string, PlanBaselineEntry>();
  baseline.queries.forEach((entry) => baselineById.set(entry.id, entry));

  const results: PlanCheckResult[] = [];

  for (const query of criticalQueries) {
    const baselineEntry = baselineById.get(query.id);
    const diffs: PlanDiff[] = [];

    if (!baselineEntry) {
      results.push({
        queryId: query.id,
        differences: [
          {
            path: query.id,
            field: "baseline",
            message: "Missing baseline entry for query",
          },
        ],
      });
      continue;
    }

    const currentSqlHash = hashSql(query.sql);
    if (baselineEntry.sqlHash && baselineEntry.sqlHash !== currentSqlHash) {
      diffs.push({
        path: query.id,
        field: "sqlHash",
        baseline: baselineEntry.sqlHash,
        current: currentSqlHash,
        message: "SQL text changed; refresh baseline required",
      });
    }

    const signature = await runExplain(
      options.pool,
      query.sql,
      options.analyze ?? baseline.analyze
    );

    if (baselineEntry.signature) {
      comparePlanSignatures(baselineEntry.signature, signature, "", diffs);
    }

    results.push({
      queryId: query.id,
      differences: diffs,
      signature,
    });
  }

  return results;
}
