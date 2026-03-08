#!/usr/bin/env node
/**
 * Summit supersedence planner (dry-run / report-only)
 */

import fs from "node:fs/promises";
import path from "node:path";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;

if (!token) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}
if (!repoEnv || !repoEnv.includes("/")) {
  console.error("Missing or invalid REPO");
  process.exit(1);
}

const [owner, repo] = repoEnv.split("/");

const MIN_SCORE = Number(process.env.SUPERSEDENCE_MIN_SCORE || "0.78");
const PENDING_CLOSE_SCORE = Number(process.env.SUPERSEDENCE_PENDING_CLOSE_SCORE || "0.80");
const AUTO_CLOSE_SCORE = Number(process.env.SUPERSEDENCE_AUTO_CLOSE_SCORE || "0.90");
const MAX_PRS = Number(process.env.SUPERSEDENCE_MAX_PRS || "250");
const MAX_FILES_PER_PR = Number(process.env.SUPERSEDENCE_MAX_FILES_PER_PR || "300");

const NOW = new Date().toISOString();

const DO_NOT_SUPERSEDE_LABELS = new Set([
  "do-not-supersede",
  "supersedence:review",
  "legal-hold",
  "keep-open",
]);

const GENERIC_TOKENS = new Set([
  "a", "an", "the", "and", "or", "to", "for", "of", "in", "on", "with",
  "fix", "fixed", "fixes", "update", "updated", "updates", "wip", "final",
  "merge", "pr", "draft", "ready", "attempt", "try", "trying", "work", "working",
  "cleanup", "clean", "change", "changes", "improve", "improves", "improved",
]);

async function gh(pathname, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "summit-supersedence-planner",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${method} ${pathname}\n${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

function uniq(arr) {
  return [...new Set(arr)];
}

function normalizeText(s = "") {
  return s
    .toLowerCase()
    .replace(/#\d+/g, " ")
    .replace(/[`"'()[\]{}:;,.!?]/g, " ")
    .replace(/[^\w/\-.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s = "") {
  return normalizeText(s)
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !GENERIC_TOKENS.has(t))
    .filter(t => t.length > 1);
}

function setJaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

function overlapMin(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));
}

function topLevelBucket(file) {
  if (file.startsWith(".github/")) return ".github";
  if (file.startsWith("server/")) return "server";
  if (file.startsWith("client/")) return "client";
  if (file.startsWith("infra/")) return "infra";
  if (file.startsWith("docs/")) return "docs";
  if (file.startsWith("scripts/")) return "scripts";
  if (file.startsWith("packages/")) return "packages";
  if (file.startsWith("policies/")) return "policies";
  if (file.startsWith("governance/")) return "governance";
  return "root";
}

function pathBuckets(files) {
  return uniq(files.map(topLevelBucket)).sort();
}

function dominantBuckets(files) {
  const counts = new Map();
  for (const f of files) {
    const b = topLevelBucket(f);
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

function approxPatchContainment(a, b) {
  const fileOverlap = overlapMin(a.files, b.files);
  const sameOrBroader = b.files.length >= a.files.length;
  const newer = new Date(b.updated_at) >= new Date(a.updated_at);

  if (fileOverlap >= 0.90 && sameOrBroader && newer) return 0.95;
  if (fileOverlap >= 0.80 && sameOrBroader) return 0.85;
  if (fileOverlap >= 0.65) return 0.50;
  return 0.0;
}

function isBlockedFromSupersedence(pr) {
  return pr.labels.some(l => DO_NOT_SUPERSEDE_LABELS.has(l));
}

function semanticSimilarity(a, b) {
  return setJaccard(
    tokenize(`${a.title} ${a.body || ""}`),
    tokenize(`${b.title} ${b.body || ""}`),
  );
}

function qualityScore(pr) {
  let s = 0;

  if (!pr.draft) s += 0.15;
  if (pr.mergeable_state === "clean") s += 0.25;
  else if (pr.mergeable_state === "unstable") s += 0.15;

  if (pr.review_decision === "APPROVED") s += 0.10;

  if (pr.status_rollup === "SUCCESS") s += 0.25;
  else if (pr.status_rollup === "PENDING") s += 0.05;

  const ageDays = Math.max(
    0,
    (Date.now() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  s += Math.max(0, 0.10 - Math.min(0.10, ageDays / 365));

  s += Math.max(0, 0.10 - Math.min(0.10, pr.files.length * 0.0025));
  s += Math.max(0, 0.05 - Math.min(0.05, (pr.additions + pr.deletions) * 0.00005));

  if (!isBlockedFromSupersedence(pr)) s += 0.05;

  return Number(s.toFixed(4));
}

function supersedenceScore(a, b) {
  const fileOverlap = overlapMin(a.files, b.files);
  const bucketOverlap = setJaccard(pathBuckets(a.files), pathBuckets(b.files));
  const semantic = semanticSimilarity(a, b);
  const containment = approxPatchContainment(a, b);
  const newer = new Date(b.updated_at) > new Date(a.updated_at) ? 1 : 0;

  const score =
    0.40 * fileOverlap +
    0.15 * bucketOverlap +
    0.15 * semantic +
    0.20 * containment +
    0.10 * newer;

  return Number(score.toFixed(4));
}

function classifyTier(score) {
  if (score >= AUTO_CLOSE_SCORE) return "auto-close-safe";
  if (score >= PENDING_CLOSE_SCORE) return "pending-close";
  return "review-required";
}

function inferTheme(prs) {
  const tokens = new Map();

  for (const pr of prs) {
    for (const t of tokenize(`${pr.title} ${pr.body || ""}`)) {
      tokens.set(t, (tokens.get(t) || 0) + 1);
    }
    for (const bucket of dominantBuckets(pr.files)) {
      tokens.set(bucket, (tokens.get(bucket) || 0) + 2);
    }
  }

  const top = [...tokens.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  return top.join(" / ") || "overlapping-change-set";
}

function stableSortPRs(prs) {
  return [...prs].sort((a, b) => a.number - b.number);
}

function buildAdjacency(nodes, edges) {
  const adj = new Map();
  for (const n of nodes) adj.set(n, new Set());
  for (const e of edges) {
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }
  return adj;
}

function connectedComponents(nodes, edges) {
  const adj = buildAdjacency(nodes, edges);
  const seen = new Set();
  const out = [];

  for (const n of nodes) {
    if (seen.has(n)) continue;
    const q = [n];
    seen.add(n);
    const comp = [];

    while (q.length) {
      const cur = q.shift();
      comp.push(cur);
      for (const nxt of adj.get(cur) || []) {
        if (!seen.has(nxt)) {
          seen.add(nxt);
          q.push(nxt);
        }
      }
    }
    out.push(comp.sort((a, b) => a - b));
  }

  return out;
}

async function paginateJson(pathPrefix, perPage = 100, maxPages = 10) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const pageData = await gh(`${pathPrefix}${pathPrefix.includes("?") ? "&" : "?"}per_page=${perPage}&page=${page}`);
    if (!Array.isArray(pageData) || pageData.length === 0) break;
    out.push(...pageData);
    if (pageData.length < perPage) break;
  }
  return out;
}

async function fetchOpenPRs() {
  const raw = await paginateJson(`/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc`, 100, 10);
  return raw.slice(0, MAX_PRS);
}

async function fetchPRFiles(prNumber) {
  const files = await paginateJson(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, 100, 10);
  return files.slice(0, MAX_FILES_PER_PR).map(f => f.filename);
}

async function fetchIssue(prNumber) {
  return gh(`/repos/${owner}/${repo}/issues/${prNumber}`);
}

async function fetchGraphQL(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "summit-supersedence-planner",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphQL ${res.status}\n${text}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function fetchPRExtra(owner, repo, prNumber) {
  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          reviewDecision
          mergeable
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, { owner, repo, number: prNumber });
    const pr = data.repository.pullRequest;
    const statusRollup = pr?.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state || "UNKNOWN";
    return {
      review_decision: pr?.reviewDecision || "UNKNOWN",
      mergeable_state: pr?.mergeable || "UNKNOWN",
      status_rollup: statusRollup,
    };
  } catch (err) {
    return {
      review_decision: "UNKNOWN",
      mergeable_state: "UNKNOWN",
      status_rollup: "UNKNOWN",
      extra_fetch_error: String(err.message || err),
    };
  }
}

async function hydratePR(pr) {
  const [files, issue, extra] = await Promise.all([
    fetchPRFiles(pr.number),
    fetchIssue(pr.number),
    fetchPRExtra(owner, repo, pr.number),
  ]);

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body || "",
    draft: pr.draft,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    base: pr.base.ref,
    head: pr.head.ref,
    author: pr.user?.login || "unknown",
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    changed_files_count: pr.changed_files ?? files.length,
    files,
    labels: (issue.labels || []).map(l => l.name),
    html_url: pr.html_url,
    review_decision: extra.review_decision,
    mergeable_state: String(extra.mergeable_state || "UNKNOWN").toLowerCase(),
    status_rollup: String(extra.status_rollup || "UNKNOWN").toUpperCase(),
    extra_fetch_error: extra.extra_fetch_error || null,
  };
}

function reasonsForEdge(a, b, score) {
  const reasons = [];
  const fileOverlap = overlapMin(a.files, b.files);
  const bucketOverlap = setJaccard(pathBuckets(a.files), pathBuckets(b.files));
  const semantic = semanticSimilarity(a, b);
  const containment = approxPatchContainment(a, b);

  if (fileOverlap >= 0.80) reasons.push("high_file_overlap");
  if (bucketOverlap >= 0.50) reasons.push(`same_subsystem:${dominantBuckets(b.files).join(",")}`);
  if (semantic >= 0.35) reasons.push("semantic_intent_overlap");
  if (containment >= 0.80) reasons.push("patch_containment_approx");
  if (new Date(b.updated_at) > new Date(a.updated_at)) reasons.push("survivor_is_newer");
  if (qualityScore(b) > qualityScore(a)) reasons.push("survivor_quality_higher");
  reasons.push(`score:${score.toFixed(4)}`);

  return reasons;
}

function canCompare(a, b) {
  if (a.number === b.number) return false;
  if (a.base !== b.base) return false;
  if (a.draft && !b.draft && qualityScore(b) < qualityScore(a)) return false;
  if (isBlockedFromSupersedence(a) || isBlockedFromSupersedence(b)) return false;
  return true;
}

function pickSurvivor(componentPRs) {
  return [...componentPRs]
    .sort((a, b) => {
      const qa = qualityScore(a);
      const qb = qualityScore(b);
      if (qb !== qa) return qb - qa;
      if (new Date(b.updated_at).getTime() !== new Date(a.updated_at).getTime()) {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      return a.number - b.number;
    })[0];
}

function buildCluster(componentNumbers, byNumber, directedEdges) {
  const members = stableSortPRs(componentNumbers.map(n => byNumber.get(n)));
  const survivor = pickSurvivor(members);

  const inbound = directedEdges
    .filter(e => componentNumbers.includes(e.from) && e.to === survivor.number)
    .sort((a, b) => b.score - a.score);

  const losers = members
    .filter(pr => pr.number !== survivor.number)
    .map(pr => {
      const match = inbound.find(e => e.from === pr.number);
      const score = match?.score ?? supersedenceScore(pr, survivor);
      const tier = classifyTier(score);
      const reasons = match?.reasons ?? reasonsForEdge(pr, survivor, score);
      return {
        pr: pr.number,
        score: Number(score.toFixed(4)),
        tier,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || a.pr - b.pr);

  const confidence = losers.length
    ? Number(Math.max(...losers.map(x => x.score)).toFixed(4))
    : 0;

  const theme = inferTheme(members);

  return {
    cluster_id: `cluster-${survivor.number}`,
    theme,
    members: members.map(pr => pr.number),
    survivor: survivor.number,
    losers,
    confidence,
  };
}

function buildActions(clusters, byNumber) {
  const close_now = [];
  const close_after_timeout = [];
  const review_required = [];
  const survivors = [];

  for (const cluster of clusters) {
    survivors.push({
      pr: cluster.survivor,
      labels_to_add: ["canonical-survivor", "queue:merge-now"],
      note: "dry-run-only",
    });

    for (const loser of cluster.losers) {
      const blocked = isBlockedFromSupersedence(byNumber.get(loser.pr));
      const action = {
        pr: loser.pr,
        superseded_by: cluster.survivor,
        score: loser.score,
        tier: blocked ? "review-required" : loser.tier,
        blocked,
        mode: "dry-run-only",
      };

      if (blocked || loser.tier === "review-required") review_required.push(action);
      else if (loser.tier === "pending-close") close_after_timeout.push(action);
      else close_now.push(action);
    }
  }

  return {
    generated_at: NOW,
    mode: "report-only",
    thresholds: {
      min_score: MIN_SCORE,
      pending_close_score: PENDING_CLOSE_SCORE,
      auto_close_score: AUTO_CLOSE_SCORE,
    },
    close_now,
    close_after_timeout,
    review_required,
    survivors,
  };
}

function buildSummary(report, actions) {
  const lines = [];

  lines.push("# Supersedence Planner Summary");
  lines.push("");
  lines.push(`- Generated at: \`${report.generated_at}\``);
  lines.push(`- Mode: \`${report.mode}\``);
  lines.push(`- Open PRs analyzed: **${report.open_prs_analyzed}**`);
  lines.push(`- Candidate edges: **${report.candidate_edges}**`);
  lines.push(`- Clusters: **${report.clusters.length}**`);
  lines.push(`- Survivors: **${actions.survivors.length}**`);
  lines.push(`- Tier 1 / close-now candidates: **${actions.close_now.length}**`);
  lines.push(`- Tier 2 / pending-close candidates: **${actions.close_after_timeout.length}**`);
  lines.push(`- Review-required candidates: **${actions.review_required.length}**`);
  lines.push("");
  lines.push("## Top clusters");
  lines.push("");

  if (!report.clusters.length) {
    lines.push("_No clusters detected above threshold._");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("| Survivor | Confidence | Members | Theme |");
  lines.push("|---|---:|---:|---|");

  for (const cluster of report.clusters.slice(0, 20)) {
    lines.push(
      `| #${cluster.survivor} | ${cluster.confidence.toFixed(4)} | ${cluster.members.length} | ${cluster.theme} |`
    );
  }

  lines.push("");
  lines.push("## Recommended dry-run operator review");
  lines.push("");
  lines.push("1. Review top 10 clusters for false positives.");
  lines.push("2. Add `do-not-supersede` to any PR that must be preserved.");
  lines.push("3. Enable report-comment mode only after top clusters look clean.");
  lines.push("4. Enable close mode only for Tier 1 after at least one dry-run review cycle.");
  lines.push("");

  return lines.join("\n");
}

function buildCommentTemplates() {
  return {
    pending_close: [
      "This PR appears to be superseded by #<SURVIVOR>.",
      "",
      "Why it was flagged:",
      "- strong overlap in touched files and subsystem",
      "- later canonical PR appears to contain the same concern",
      "- survivor scored higher on mergeability / recency / CI posture",
      "",
      "This is currently report-only for Summit. No automatic closure has occurred in this run.",
      "",
      "Maintainer actions:",
      "- add `do-not-supersede` to prevent future auto-close",
      "- add `supersedence:review` to force human review",
      "- leave as-is if the successor should remain canonical",
    ].join("\n"),

    auto_close_safe: [
      "This PR has been classified as safely superseded by #<SURVIVOR>.",
      "",
      "Why it was flagged:",
      "- very high overlap and approximate containment",
      "- later canonical PR is preferred on quality / recency grounds",
      "",
      "If this classification is incorrect, add `do-not-supersede` to the relevant PR and reopen for review.",
    ].join("\n"),

    survivor_note: [
      "This PR is the current canonical survivor for a supersedence cluster.",
      "",
      "It is the preferred merge candidate because it scored best on the planner's quality function",
      "(mergeability, CI posture, recency, and narrower change-set characteristics).",
      "",
      "Current mode: report-only. No labels or merges were applied automatically.",
    ].join("\n"),
  };
}

async function main() {
  const rawPRs = await fetchOpenPRs();
  const hydrated = [];
  for (const pr of rawPRs) {
    hydrated.push(await hydratePR(pr));
  }

  const byNumber = new Map(hydrated.map(pr => [pr.number, pr]));
  const directedEdges = [];

  for (const a of hydrated) {
    for (const b of hydrated) {
      if (!canCompare(a, b)) continue;

      const score = supersedenceScore(a, b);
      if (score < MIN_SCORE) continue;

      const qa = qualityScore(a);
      const qb = qualityScore(b);
      if (qb <= qa) continue;

      directedEdges.push({
        from: a.number,
        to: b.number,
        score,
        tier: classifyTier(score),
        reasons: reasonsForEdge(a, b, score),
      });
    }
  }

  const undirectedEdges = directedEdges.map(e => ({ from: e.from, to: e.to }));
  const components = connectedComponents(hydrated.map(pr => pr.number), undirectedEdges)
    .filter(comp => comp.length > 1);

  const clusters = components
    .map(comp => buildCluster(comp, byNumber, directedEdges))
    .filter(cluster => cluster.losers.length > 0)
    .sort((a, b) => b.confidence - a.confidence || a.survivor - b.survivor);

  const report = {
    schema_version: "1.0.0",
    generated_at: NOW,
    mode: "report-only",
    repository: `${owner}/${repo}`,
    thresholds: {
      min_score: MIN_SCORE,
      pending_close_score: PENDING_CLOSE_SCORE,
      auto_close_score: AUTO_CLOSE_SCORE,
    },
    open_prs_analyzed: hydrated.length,
    candidate_edges: directedEdges.length,
    clusters,
    comment_templates: buildCommentTemplates(),
  };

  const actions = buildActions(clusters, byNumber);
  const summary = buildSummary(report, actions);

  await fs.mkdir(path.join(process.cwd(), "artifacts"), { recursive: true });
  await fs.writeFile("artifacts/supersedence-report.json", `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile("artifacts/supersedence-actions.json", `${JSON.stringify(actions, null, 2)}\n`);
  await fs.writeFile("artifacts/supersedence-summary.md", `${summary}\n`);

  console.log(summary);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
