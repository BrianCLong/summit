#!/usr/bin/env node
/**
 * gh-velocity-distance.js
 * Enhanced end-to-end script: fetches merged PRs, computes velocity, and estimates distance-to-done
 * for highest-priority (P0/P1) work. No external dependencies.
 *
 * Features
 * - Customizable label schemes for story points and priority
 * - Velocity by sprint, throughput by week, cycle/review time percentiles
 * - Remaining points + distance (sprints) + ETA per priority group
 * - Golden Path risk flagging when critical work drifts beyond threshold sprints
 */

const https = require("https");
const { URL } = require("url");
const fs = require("fs");

// ---------------- Config ----------------
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const WEEKS = parseInt(process.env.WEEKS || "6", 10); // look-back window
const SPRINT_LENGTH_DAYS = parseInt(process.env.SPRINT_LENGTH_DAYS || "14", 10);

// Custom label patterns (comma-separated env vars)
// e.g. POINT_LABELS="sp:,pts:,size/" allows labels like sp:3, pts:5, size/2
const POINT_LABELS = (process.env.POINT_LABELS || "sp:")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const PRIORITY_LABELS = {
  P0: (process.env.P0_LABELS || "p0,critical,priority:critical")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  P1: (process.env.P1_LABELS || "p1,high,priority:high")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  P2: (process.env.P2_LABELS || "p2,medium,priority:medium")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
const GOLDEN_PATH_THRESHOLD = parseInt(
  process.env.GOLDEN_PATH_THRESHOLD || "2",
  10,
); // sprints
const OPEN_ITEMS_PREVIEW = parseInt(process.env.OPEN_ITEMS_PREVIEW || "5", 10);

if (!GITHUB_TOKEN || !OWNER || !REPO) {
  console.error("Missing required env vars. Set GITHUB_TOKEN, OWNER, REPO.");
  process.exit(1);
}

const NOW = new Date();
const SINCE = new Date(NOW.getTime() - WEEKS * 7 * 24 * 3600 * 1000);

// ---------------- Helpers ----------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function iso(d) {
  return new Date(d).toISOString();
}
function toHours(ms) {
  return ms / 3600000;
}

function weekKey(d) {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = (p / 100) * (a.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  const w = idx - lo;
  return a[lo] * (1 - w) + a[hi] * w;
}

function ceil(n) {
  return Math.ceil(n);
}

function parseStoryPoints(title, labels) {
  for (const l of labels || []) {
    for (const prefix of POINT_LABELS) {
      const escapeRE = new RegExp("[.*+?^${}()|[\]\\]", "g");
      const escaped = prefix.replace(escapeRE, "\$&");
      const re = new RegExp("^" + escaped + "(\\d+)$", "i");
      const m = re.exec(l);
      if (m) return parseInt(m[1], 10);
    }
  }
  const m2 = /\[(?:sp|pts):(\d+)\]/i.exec(title || "");
  if (m2) return parseInt(m2[1], 10);
  return 1; // conservative default
}

function derivePriority(labels) {
  const ls = (labels || []).map((s) => s.toLowerCase());
  for (const [prio, patterns] of Object.entries(PRIORITY_LABELS)) {
    if (ls.some((x) => patterns.some((p) => x.includes(p.toLowerCase()))))
      return prio;
  }
  return "P3+";
}

function priorityRank(p) {
  return { P0: 0, P1: 1, P2: 2, "P3+": 3 }[p] ?? 9;
}

function buildSprints(now, sprintDays, coverageDays) {
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
    ),
  );
  const windows = [];
  let curEnd = end;
  for (let i = 0; i < Math.ceil(coverageDays / sprintDays) + 2; i++) {
    const start = new Date(
      curEnd.getTime() - sprintDays * 24 * 3600 * 1000 + 1,
    );
    windows.unshift({ start, end: curEnd });
    curEnd = new Date(start.getTime() - 1);
  }
  return windows;
}

function sparkline(points) {
  const ticks = "▁▂▃▄▅▆▇█";
  const max = points.length ? Math.max(...points) : 0;
  if (max === 0) return "".padEnd(points.length, "▁");
  return points
    .map((v) => ticks[Math.round((v / max) * (ticks.length - 1))] || "▁")
    .join("");
}

// ---------------- GitHub GraphQL Client ----------------
const GQL_ENDPOINT = "https://api.github.com/graphql";
async function gql(query, variables = {}, attempt = 0) {
  const payload = JSON.stringify({ query, variables });
  const url = new URL(GQL_ENDPOINT);
  const options = {
    method: "POST",
    headers: {
      "User-Agent": "gh-velocity-script",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
  };

  const body = await new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode, data, headers: res.headers }),
      );
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

  if (body.status === 401 || body.status === 403) {
    console.error(
      "Auth/permission error from GitHub:",
      body.status,
      "rateRemaining=",
      body.headers["x-ratelimit-remaining"],
    );
    process.exit(2);
  }

  let parsed;
  try {
    parsed = JSON.parse(body.data);
  } catch {
    parsed = {};
  }

  if (
    body.status >= 500 ||
    (parsed.errors && parsed.errors.some((e) => /rate limit/i.test(e.message)))
  ) {
    if (attempt < 5) {
      const backoff = 500 * Math.pow(2, attempt);
      await sleep(backoff);
      return gql(query, variables, attempt + 1);
    }
  }

  if (parsed.errors) {
    console.error("GraphQL errors:", JSON.stringify(parsed.errors, null, 2));
  }
  return parsed;
}

// ---------------- Data Fetch ----------------
async function fetchMergedPRsSince(owner, repo, sinceISO) {
  const prNodes = [];
  let cursor = null;
  const query = `
    query($owner:String!, $repo:String!, $cursor:String) {
      repository(owner:$owner, name:$repo) {
        pullRequests(states:MERGED, orderBy:{field:UPDATED_AT, direction:DESC}, first:100, after:$cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            number
            title
            url
            createdAt
            closedAt
            mergedAt
            additions
            deletions
            changedFiles
            labels(first:50) { nodes { name } }
            files(first:100) { nodes { path additions deletions } pageInfo { hasNextPage endCursor } }
            reviews(first:100, states:[APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING]) { nodes { submittedAt } pageInfo { hasNextPage endCursor } }
            closingIssuesReferences(first:20) { nodes { number title url labels(first:20){nodes{name}} } }
          }
        }
      }
      rateLimit { remaining resetAt cost }
    }
  `;

  let keepGoing = true;
  while (keepGoing) {
    const res = await gql(query, { owner, repo, cursor });
    if (!res || !res.data) break;
    const prs = res.data.repository.pullRequests.nodes;
    for (const pr of prs) {
      if (new Date(pr.mergedAt) < new Date(sinceISO)) {
        keepGoing = false;
        break;
      }
      prNodes.push(pr);
    }
    const pi = res.data.repository.pullRequests.pageInfo;
    cursor = pi.endCursor;
    if (!pi.hasNextPage) break;
    await sleep(200);
  }
  return prNodes;
}

async function fetchOpenIssuesAndPRs(owner, repo) {
  const items = [];
  // Open issues
  let cursor = null;
  const qIssues = `
    query($owner:String!, $repo:String!, $cursor:String) {
      repository(owner:$owner, name:$repo) {
        issues(states:OPEN, first:100, after:$cursor, orderBy:{field:UPDATED_AT, direction:DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes { number title url labels(first:20){nodes{name}} }
        }
      }
    }
  `;
  while (true) {
    const res = await gql(qIssues, { owner, repo, cursor });
    if (!res || !res.data) break;
    const nodes = res.data.repository.issues.nodes;
    for (const it of nodes) {
      items.push({
        type: "issue",
        number: it.number,
        title: it.title,
        url: it.url,
        labels: it.labels.nodes.map((n) => n.name),
      });
    }
    const pi = res.data.repository.issues.pageInfo;
    cursor = pi.endCursor;
    if (!pi.hasNextPage) break;
    await sleep(150);
  }

  // Open PRs
  cursor = null;
  const qPRs = `
    query($owner:String!, $repo:String!, $cursor:String) {
      repository(owner:$owner, name:$repo) {
        pullRequests(states:OPEN, first:100, after:$cursor, orderBy:{field:UPDATED_AT, direction:DESC}) {
          pageInfo { hasNextPage endCursor }
          nodes { number title url labels(first:20){nodes{name}} }
        }
      }
    }
  `;
  while (true) {
    const res = await gql(qPRs, { owner, repo, cursor });
    if (!res || !res.data) break;
    const nodes = res.data.repository.pullRequests.nodes;
    for (const it of nodes) {
      items.push({
        type: "pr",
        number: it.number,
        title: it.title,
        url: it.url,
        labels: it.labels.nodes.map((n) => n.name),
      });
    }
    const pi = res.data.repository.pullRequests.pageInfo;
    cursor = pi.endCursor;
    if (!pi.hasNextPage) break;
    await sleep(150);
  }
  return items;
}

// ---------------- Computation ----------------
function computeMetrics(mergedPRs, openItems, now, sprintDays) {
  // Velocity per sprint
  const sprintWindows = buildSprints(now, sprintDays, WEEKS * 7);
  const velocityPerSprint = sprintWindows.map((w) => ({
    sprintStart: iso(w.start),
    sprintEnd: iso(w.end),
    points: 0,
  }));

  const throughputPerWeekMap = new Map();
  const cycleTimes = [];
  const reviewTimes = [];
  const prSizes = [];

  // priority groups keyed by derived name
  const groups = new Map();

  for (const pr of mergedPRs) {
    const prLabels = (pr.labels?.nodes || []).map((n) => n.name);
    const sp = parseStoryPoints(pr.title, prLabels);
    const priority = derivePriority(prLabels);

    // Velocity
    const mergedAt = new Date(pr.mergedAt);
    for (const v of velocityPerSprint) {
      const s = new Date(v.sprintStart);
      const e = new Date(v.sprintEnd);
      if (mergedAt >= s && mergedAt <= e) {
        v.points += sp;
        break;
      }
    }

    // Throughput per week
    const wk = weekKey(mergedAt);
    throughputPerWeekMap.set(wk, (throughputPerWeekMap.get(wk) || 0) + 1);

    // Cycle time
    const createdAt = new Date(pr.createdAt);
    cycleTimes.push(toHours(mergedAt - createdAt));

    // Review time
    let firstReview = null;
    const reviews = pr.reviews?.nodes || [];
    for (const r of reviews) {
      if (!r.submittedAt) continue;
      const dt = new Date(r.submittedAt);
      if (!firstReview || dt < firstReview) firstReview = dt;
    }
    if (firstReview) reviewTimes.push(toHours(mergedAt - firstReview));
    else if (pr.closedAt)
      reviewTimes.push(toHours(new Date(pr.closedAt) - createdAt));

    // PR size
    prSizes.push((pr.additions || 0) + (pr.deletions || 0));

    // Determine group key: prefer first closing issue; fallback to priority bucket
    let groupKey = null;
    const closers = pr.closingIssuesReferences?.nodes || [];
    if (closers.length) {
      const is = closers[0];
      groupKey = `${priority}: ${is.title}`;
    } else {
      groupKey = `${priority}: Unscoped Priority Work`;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        priority,
        completedPoints: 0,
        remainingPoints: 0,
        velocityPointsPerSprint: 0,
        distanceSprints: 0,
        eta: null,
        risk: null,
        openItems: [],
        recentMerged: [],
      });
    }

    const g = groups.get(groupKey);
    g.completedPoints += sp;
    g.recentMerged.push({
      pr: pr.number,
      title: pr.title,
      points: sp,
      mergedAt: iso(pr.mergedAt),
      url: pr.url,
    });
  }

  // Velocity average across last 3 sprints
  const last3 = velocityPerSprint.slice(-3);
  const avgV = last3.length
    ? last3.reduce((a, b) => a + b.points, 0) / last3.length
    : 0;

  // Remaining points estimation per group using open items
  for (const [key, g] of groups.entries()) {
    const targetP = g.priority;
    const titleMatch = key.split(":").slice(1).join(":").trim();

    const related = openItems.filter((it) => {
      const p = derivePriority(it.labels);
      if (p !== targetP) return false;
      if (titleMatch && titleMatch !== "Unscoped Priority Work") {
        const hay = (it.title || "").toLowerCase();
        const needle = titleMatch.toLowerCase();
        return hay.includes(needle);
      }
      return true;
    });

    const avgCompleted =
      g.completedPoints > 0 && g.recentMerged.length > 0
        ? g.completedPoints / g.recentMerged.length
        : 1;
    let rp = 0;
    for (const it of related) {
      const sp = parseStoryPoints(it.title, it.labels);
      rp += sp || avgCompleted || 1;
      g.openItems.push({
        type: it.type,
        number: it.number,
        title: it.title,
        points: sp || avgCompleted || 1,
        url: it.url,
      });
    }

    g.remainingPoints = rp;
    g.velocityPointsPerSprint = avgV;
    g.distanceSprints = avgV > 0 ? ceil(rp / avgV) : rp > 0 ? 999 : 0;
    if (g.distanceSprints >= 999) g.eta = null;
    else {
      const etaMs =
        now.getTime() +
        g.distanceSprints * SPRINT_LENGTH_DAYS * 24 * 3600 * 1000;
      const eta = new Date(etaMs);
      g.eta = eta.toISOString().slice(0, 10);
    }

    // Risk flagging for Golden Path
    if (g.priority === "P0" && g.distanceSprints > GOLDEN_PATH_THRESHOLD) {
      g.risk = "⚠️ Golden Path at risk";
    }
  }

  const throughputPerWeek = Array.from(throughputPerWeekMap.entries())
    .map(([week, prs]) => ({ week, prs }))
    .sort((a, b) => a.week.localeCompare(b.week));

  const metrics = {
    generatedAt: iso(now),
    sprintLengthDays: sprintDays,
    lookbackWeeks: WEEKS,
    velocity: { perSprint: velocityPerSprint },
    throughput: { perWeek: throughputPerWeek },
    cycleTimeHours: {
      p50: percentile(cycleTimes, 50),
      p75: percentile(cycleTimes, 75),
      p90: percentile(cycleTimes, 90),
    },
    reviewTimeHours: {
      p50: percentile(reviewTimes, 50),
      p75: percentile(reviewTimes, 75),
      p90: percentile(reviewTimes, 90),
    },
    size: { medianChanges: percentile(prSizes, 50) },
    priorityGroups: Array.from(groups.values()).sort((a, b) => {
      const prio = priorityRank(a.priority) - priorityRank(b.priority);
      if (prio !== 0) return prio; // P0 first
      return (b.remainingPoints || 0) - (a.remainingPoints || 0);
    }),
  };

  return metrics;
}

function formatMarkdown(metrics) {
  const lines = [];
  lines.push(`# Velocity & Distance Report`);
  lines.push(`Generated: ${metrics.generatedAt}`);
  lines.push("");

  // Velocity sparkline
  const pts = metrics.velocity.perSprint.map((v) => v.points);
  lines.push(`**Velocity (pts/sprint)**: ${sparkline(pts)}`);
  lines.push(
    metrics.velocity.perSprint
      .map(
        (v) =>
          `(${v.sprintStart.slice(0, 10)}→${v.sprintEnd.slice(0, 10)}: ${v.points})`,
      )
      .join(" "),
  );
  lines.push("");

  // Throughput per week
  if (metrics.throughput.perWeek.length) {
    lines.push(`**Throughput (PRs/week)**`);
    lines.push(
      metrics.throughput.perWeek.map((w) => `${w.week}:${w.prs}`).join("  "),
    );
    lines.push("");
  }

  // Priority table
  lines.push(
    `| Group | Priority | Completed pts | Remaining pts | V (pts/sprint) | Distance | ETA | Risk |`,
  );
  lines.push(`|---|---:|---:|---:|---:|---:|---|---|`);
  for (const g of metrics.priorityGroups) {
    lines.push(
      `| ${g.key} | ${g.priority} | ${g.completedPoints} | ${g.remainingPoints} | ${g.velocityPointsPerSprint.toFixed(
        1,
      )} | ${g.distanceSprints} | ${g.eta ?? "—"} | ${g.risk ?? ""} |`,
    );
  }
  lines.push("");

  // Open items preview
  const allOpen = metrics.priorityGroups.flatMap((g) =>
    g.openItems.map((oi) => ({ ...oi, g: g.key, p: g.priority })),
  );
  allOpen.sort(
    (a, b) => priorityRank(a.p) - priorityRank(b.p) || b.points - a.points,
  );
  const top = allOpen.slice(0, OPEN_ITEMS_PREVIEW);
  if (top.length) {
    lines.push("**Top Open Priority Items**");
    for (const it of top) {
      lines.push(
        `- [${it.type} #${it.number}] ${it.title} — ${it.points} pts (${it.g})`,
      );
    }
  }

  // Summary stats
  lines.push("");
  lines.push(
    `**Cycle Time (hours)** p50=${metrics.cycleTimeHours.p50.toFixed(1)}, p75=${metrics.cycleTimeHours.p75.toFixed(
      1,
    )}, p90=${metrics.cycleTimeHours.p90.toFixed(1)}`,
  );
  lines.push(
    `**Review Time (hours)** p50=${metrics.reviewTimeHours.p50.toFixed(1)}, p75=${metrics.reviewTimeHours.p75.toFixed(
      1,
    )}, p90=${metrics.reviewTimeHours.p90.toFixed(1)}`,
  );
  lines.push(
    `**Median PR size (changes)** ${metrics.size.medianChanges.toFixed(0)}`,
  );

  return lines.join("\n");
}

// ---------------- Main ----------------
(async function main() {
  try {
    console.error(
      `Fetching merged PRs for ${OWNER}/${REPO} since ${SINCE.toISOString().slice(0, 10)}...`,
    );
    const prs = await fetchMergedPRsSince(OWNER, REPO, SINCE.toISOString());
    console.error(`Merged PRs found: ${prs.length}`);

    console.error("Fetching open issues and PRs...");
    const openItems = await fetchOpenIssuesAndPRs(OWNER, REPO);
    console.error(`Open items fetched: ${openItems.length}`);

    const metrics = computeMetrics(
      prs,
      openItems,
      new Date(),
      SPRINT_LENGTH_DAYS,
    );

    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));
    console.log(formatMarkdown(metrics));
  } catch (err) {
    console.error("Fatal error:", (err && err.stack) || err);
    process.exit(1);
  }
})();
