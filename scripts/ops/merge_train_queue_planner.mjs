#!/usr/bin/env node

import fs from "node:fs";

const QUEUE_LABELS = {
  mergeNow: "queue:merge-now",
  needsRebase: "queue:needs-rebase",
  conflict: "queue:conflict",
  blocked: "queue:blocked",
  obsolete: "queue:obsolete",
  splitRequired: "queue:split-required",
};

const PRIO_RANK = {
  "prio:P0": 0,
  "prio:P1": 1,
  "prio:P2": 2,
  "prio:P3": 3,
};

function parseArgs(argv) {
  const args = {
    input: "",
    batchSize: 25,
    staleDays: 45,
    now: new Date(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") args.input = argv[i + 1] ?? "";
    if (arg === "--batch-size") args.batchSize = Number(argv[i + 1] ?? "25");
    if (arg === "--stale-days") args.staleDays = Number(argv[i + 1] ?? "45");
    if (arg === "--now") args.now = new Date(argv[i + 1] ?? "");
  }

  if (!args.input) {
    throw new Error("Missing --input <path-to-open-prs.json>");
  }

  return args;
}

function normalizeLabels(pr) {
  if (!Array.isArray(pr.labels)) return [];
  return pr.labels
    .map((label) => (typeof label === "string" ? label : label?.name))
    .filter(Boolean);
}

function hasLabel(labels, name) {
  return labels.some((label) => label.toLowerCase() === name.toLowerCase());
}

function findPriority(labels) {
  for (const label of labels) {
    if (Object.hasOwn(PRIO_RANK, label)) return label;
  }
  return "prio:P9";
}

function classifyPr(pr, options) {
  const labels = normalizeLabels(pr);
  const updatedAt = new Date(pr.updatedAt || pr.updated_at || 0);
  const staleCutoff = new Date(options.now.getTime() - options.staleDays * 24 * 60 * 60 * 1000);

  const isBlocked = hasLabel(labels, QUEUE_LABELS.blocked) || hasLabel(labels, "do-not-merge");
  const isMergeConflict = pr.mergeable === "CONFLICTING";
  const checksFailing = pr.statusCheckRollup?.state === "FAILURE" || pr.status === "failure" || (pr.checks && pr.checks.some(c => c.state === "FAIL"));
  const checksPassing = pr.statusCheckRollup?.state === "SUCCESS" || pr.status === "success" || (pr.checks && pr.checks.every(c => c.state === "PASS"));
  const behindBase = Number(pr.commitsBehindBase ?? pr.behindBy ?? 0) > 0;
  const approvalsSatisfied =
    pr.reviewDecision === undefined || ["APPROVED", "REVIEW_REQUIRED"].includes(pr.reviewDecision);
  const likelyDuplicate = Boolean(pr.isDuplicate || labels.includes("duplicate"));
  const targetDeleted = Boolean(pr.baseRefDeleted || pr.baseDeleted);

  // Large diff check for split-required
  const isLarge = pr.changedFiles > 50 || pr.additions > 1000;

  if (targetDeleted || likelyDuplicate) return QUEUE_LABELS.obsolete;
  if (isLarge) return QUEUE_LABELS.splitRequired;
  if (isBlocked) return QUEUE_LABELS.blocked;
  if (isMergeConflict) return QUEUE_LABELS.conflict;

  const staleConflict = updatedAt <= staleCutoff && checksFailing && !pr.assignees?.length;
  if (staleConflict) return QUEUE_LABELS.obsolete;

  if ((checksFailing && behindBase) || behindBase) return QUEUE_LABELS.needsRebase;
  if (checksPassing && pr.mergeable !== "CONFLICTING" && approvalsSatisfied)
    return QUEUE_LABELS.mergeNow;

  return QUEUE_LABELS.blocked;
}

function sortForMerge(prs) {
  return [...prs].sort((a, b) => {
    const aLabels = normalizeLabels(a);
    const bLabels = normalizeLabels(b);
    const aPrio = PRIO_RANK[findPriority(aLabels)] ?? 9;
    const bPrio = PRIO_RANK[findPriority(bLabels)] ?? 9;
    if (aPrio !== bPrio) return aPrio - bPrio;

    const aMergeable = a.mergeable === "MERGEABLE" ? 0 : 1;
    const bMergeable = b.mergeable === "MERGEABLE" ? 0 : 1;
    if (aMergeable !== bMergeable) return aMergeable - bMergeable;

    const aSuccess = (a.statusCheckRollup?.state === "SUCCESS" || a.status === "success" || (a.checks && a.checks.every(c => c.state === "PASS"))) ? 0 : 1;
    const bSuccess = (b.statusCheckRollup?.state === "SUCCESS" || b.status === "success" || (b.checks && b.checks.every(c => c.state === "PASS"))) ? 0 : 1;
    if (aSuccess !== bSuccess) return aSuccess - bSuccess;

    return (
      new Date(a.updatedAt || a.updated_at || 0).getTime() -
      new Date(b.updatedAt || b.updated_at || 0).getTime()
    );
  });
}

function buildPlan(openPrs, options) {
  const bucketed = {
    [QUEUE_LABELS.mergeNow]: [],
    [QUEUE_LABELS.needsRebase]: [],
    [QUEUE_LABELS.conflict]: [],
    [QUEUE_LABELS.blocked]: [],
    [QUEUE_LABELS.obsolete]: [],
    [QUEUE_LABELS.splitRequired]: [],
  };

  for (const pr of openPrs) {
    const queueLabel = classifyPr(pr, options);
    bucketed[queueLabel].push({
      number: pr.number,
      title: pr.title,
      queueLabel,
      priority: findPriority(normalizeLabels(pr)),
      mergeable: pr.mergeable ?? "UNKNOWN",
      status: pr.statusCheckRollup?.state ?? pr.status ?? "UNKNOWN",
      updatedAt: pr.updatedAt || pr.updated_at,
    });
  }

  const orderedMergeNow = sortForMerge(
    openPrs.filter((pr) => classifyPr(pr, options) === QUEUE_LABELS.mergeNow)
  );
  const nextBatch = orderedMergeNow.slice(0, options.batchSize).map((pr) => pr.number);

  return {
    generatedAt: options.now.toISOString(),
    totalOpenPrs: openPrs.length,
    queueCounts: Object.fromEntries(Object.entries(bucketed).map(([k, v]) => [k, v.length])),
    nextBatch,
    buckets: bucketed,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = fs.readFileSync(args.input, "utf8");
  const openPrs = JSON.parse(raw);
  if (!Array.isArray(openPrs)) {
    throw new Error("Input JSON must be an array of pull requests.");
  }

  const plan = buildPlan(openPrs, args);
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { QUEUE_LABELS, buildPlan, classifyPr, sortForMerge };
