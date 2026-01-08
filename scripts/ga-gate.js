#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const GA_SPEC_MARKER_START = "<!-- GA-GATE-SPEC:START -->";
const GA_SPEC_MARKER_END = "<!-- GA-GATE-SPEC:END -->";

function parseGateSpec(markdownContent) {
  const match = markdownContent.match(
    /<!-- GA-GATE-SPEC:START -->[\s\S]*?```json\n([\s\S]*?)```[\s\S]*?<!-- GA-GATE-SPEC:END -->/i
  );
  if (match) {
    return JSON.parse(match[1]);
  }

  const start = markdownContent.indexOf(GA_SPEC_MARKER_START);
  const end = markdownContent.indexOf(GA_SPEC_MARKER_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("GA gate spec markers not found in docs/ga/ga-gate.md");
  }
  const jsonBlock = markdownContent.slice(start + GA_SPEC_MARKER_START.length, end).trim();
  const fenced = jsonBlock.match(/```json\n([\s\S]*?)```/);
  if (fenced) {
    return JSON.parse(fenced[1]);
  }
  const firstBrace = jsonBlock.indexOf("{");
  const lastBrace = jsonBlock.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(jsonBlock.slice(firstBrace, lastBrace + 1));
  }
  throw new Error("GA gate spec JSON block missing");
}

function normalizeStatus(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 1;
  return num;
}

function evaluateRequiredChecks(spec, statusMap) {
  const details = spec.requiredChecks.map((check) => {
    const status = normalizeStatus(statusMap[check]);
    return {
      name: check,
      status: status === 0 ? "pass" : "fail",
      message: status === 0 ? `${check} passed` : `${check} failed or missing`,
    };
  });
  const failed = details.some((d) => d.status === "fail");
  return {
    category: "requiredChecks",
    status: failed ? "fail" : "pass",
    details,
  };
}

function evaluateSecurity(spec, statusMap) {
  const details = spec.securityChecks.map((check) => {
    const status = normalizeStatus(statusMap[check]);
    return {
      name: check,
      status: status === 0 ? "pass" : "fail",
      message: status === 0 ? `${check} placeholder passed` : `${check} placeholder failed`,
    };
  });
  const failed = details.some((d) => d.status === "fail");
  return {
    category: "security",
    status: failed ? "fail" : "pass",
    details,
  };
}

function evaluateObservability(spec, fileExistsFn = fs.existsSync) {
  const details = spec.observability.sloFiles.map((file) => {
    const exists = fileExistsFn(path.resolve(file));
    return {
      name: file,
      status: exists ? "pass" : "fail",
      message: exists ? "SLO config present" : "SLO config missing",
    };
  });
  const failed = details.some((d) => d.status === "fail");
  return {
    category: "observability",
    status: failed ? "fail" : "pass",
    details,
  };
}

function parseCodeowners(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  return lines.map((line) => {
    const [pattern, ...owners] = line.split(/\s+/);
    return { pattern, owners };
  });
}

function matchCodeowners(pattern, filePath) {
  if (!pattern) return false;
  if (pattern === "*") return true;
  if (pattern.endsWith("/**")) {
    const base = pattern.replace("/**", "").replace(/^\//, "");
    return filePath === base || filePath.startsWith(`${base}/`);
  }
  const normalizedPattern = pattern.replace(/^\//, "");
  return filePath === normalizedPattern || filePath.startsWith(`${normalizedPattern}/`);
}

function latestApprovals(reviews) {
  const approvals = new Map();
  reviews
    .filter((r) => r.state === "APPROVED")
    .forEach((review) => {
      approvals.set(review.user.login, review.submitted_at || review.submittedAt || "");
    });
  return approvals;
}

function evaluateGovernance(spec, options) {
  const {
    labels = [],
    approvals = new Map(),
    touchedFiles = [],
    codeowners = [],
    isPullRequest,
  } = options;

  if (!isPullRequest) {
    return {
      category: "governance",
      status: "fail",
      details: [
        {
          name: "pull_request_event",
          status: "fail",
          message: "Governance checks require a pull_request event",
        },
      ],
    };
  }

  const labelDetails = (spec.governance.requiredLabels || []).map((pattern) => {
    const normalized = pattern.replace("*", "");
    const present = labels.some((label) => label.startsWith(normalized));
    return {
      name: `label_${normalized.replace(/\\W+/g, "_")}`,
      status: present ? "pass" : "fail",
      message: present ? `${pattern} label present` : `${pattern} label missing`,
    };
  });

  const approvalsCount = approvals.size;
  const approvalDetail = {
    name: "min_approvals",
    status: approvalsCount >= spec.governance.minApprovals ? "pass" : "fail",
    message:
      approvalsCount >= spec.governance.minApprovals
        ? `Received ${approvalsCount} approvals`
        : `Requires at least ${spec.governance.minApprovals} approvals (received ${approvalsCount})`,
  };

  const pathDetails = spec.governance.codeownerPaths.map((requiredPath) => {
    const normalized = requiredPath.replace(/^\//, "");
    const relevantFiles = touchedFiles.filter(
      (file) => file === normalized || file.startsWith(`${normalized}/`)
    );
    if (relevantFiles.length === 0) {
      return {
        name: `codeowners_${normalized}`,
        status: "pass",
        message: `No changes in ${normalized}; no CODEOWNERS approval required`,
      };
    }

    const ownersForPath = codeowners
      .filter((entry) => relevantFiles.some((file) => matchCodeowners(entry.pattern, file)))
      .flatMap((entry) => entry.owners);

    const normalizedOwners = ownersForPath.map((owner) => owner.replace(/^@/, ""));
    const teamOwners = normalizedOwners.filter((owner) => owner.includes("/"));
    const userOwners = normalizedOwners.filter((owner) => !owner.includes("/"));

    const approvedByOwner = userOwners.some((owner) => approvals.has(owner));
    const messageBase = `Changes in ${normalized} require CODEOWNERS approval`;

    if (approvedByOwner) {
      return {
        name: `codeowners_${normalized}`,
        status: "pass",
        message: `${messageBase}; approval from ${userOwners.find((o) => approvals.has(o))}`,
      };
    }

    if (teamOwners.length > 0 && approvalsCount > 0) {
      return {
        name: `codeowners_${normalized}`,
        status: "pass",
        message: `${messageBase}; team ownership detected (${teamOwners.join(", ")}), approvals present`,
      };
    }

    return {
      name: `codeowners_${normalized}`,
      status: "fail",
      message: `${messageBase}; no matching CODEOWNERS approval detected`,
    };
  });

  const details = [...labelDetails, approvalDetail, ...pathDetails];
  const failed = details.some((d) => d.status === "fail");
  return {
    category: "governance",
    status: failed ? "fail" : "pass",
    details,
  };
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ga-gate",
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function collectPullRequestContext(token, repo, pullNumber) {
  const [owner, name] = repo.split("/");
  const labels = [];
  const approvals = new Map();
  const files = [];

  const prData = await fetchJson(
    `https://api.github.com/repos/${owner}/${name}/pulls/${pullNumber}`,
    token
  );
  (prData.labels || []).forEach((label) => labels.push(label.name));

  const reviews = await fetchJson(
    `https://api.github.com/repos/${owner}/${name}/pulls/${pullNumber}/reviews`,
    token
  );
  const approvalMap = latestApprovals(reviews);
  approvalMap.forEach((value, key) => approvals.set(key, value));

  let page = 1;
  const perPage = 100;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pageFiles = await fetchJson(
      `https://api.github.com/repos/${owner}/${name}/pulls/${pullNumber}/files?per_page=${perPage}&page=${page}`,
      token
    );
    pageFiles.forEach((file) => files.push(file.filename));
    if (pageFiles.length < perPage) break;
    page += 1;
  }

  return { labels, approvals, files };
}

function buildReport({ sha, results, verdict }) {
  return {
    sha,
    verdict,
    timestamp: new Date().toISOString(),
    results,
  };
}

async function run() {
  const specPath = path.resolve("docs/ga/ga-gate.md");
  const spec = parseGateSpec(fs.readFileSync(specPath, "utf8"));

  const requiredResults = evaluateRequiredChecks(spec, {
    tests: process.env.TESTS_STATUS,
    typecheck: process.env.TYPECHECK_STATUS,
    lint: process.env.LINT_STATUS,
    build: process.env.BUILD_STATUS,
  });

  const securityResults = evaluateSecurity(spec, {
    "dependency-audit": process.env.SECURITY_DEPENDENCY_AUDIT_STATUS,
    provenance: process.env.SECURITY_PROVENANCE_STATUS,
  });

  const observabilityResults = evaluateObservability(spec);

  const eventName = process.env.GITHUB_EVENT_NAME;
  const isPullRequest = eventName === "pull_request";
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA || "unknown";

  let governanceResults;
  if (isPullRequest) {
    const prNumber = process.env.PR_NUMBER || process.env.GITHUB_REF?.split("/").pop();
    if (!prNumber) {
      throw new Error("Unable to determine pull request number for governance checks");
    }
    const context = await collectPullRequestContext(token, repo, prNumber);
    const codeowners = parseCodeowners(path.resolve("CODEOWNERS"));
    governanceResults = evaluateGovernance(spec, {
      labels: context.labels,
      approvals: context.approvals,
      touchedFiles: context.files,
      codeowners,
      isPullRequest: true,
    });
  } else {
    governanceResults = evaluateGovernance(spec, { isPullRequest: false });
  }

  const results = [requiredResults, securityResults, governanceResults, observabilityResults];
  const verdict = results.every((r) => r.status === "pass") ? "pass" : "fail";

  const report = buildReport({ sha, results, verdict });
  const artifactsDir = path.resolve("artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const reportPath = path.join(artifactsDir, "ga-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  if (verdict === "fail") {
    console.error("GA gate failed:", JSON.stringify(report, null, 2));
    process.exit(1);
  } else {
    console.log("GA gate passed");
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = {
  parseGateSpec,
  evaluateRequiredChecks,
  evaluateSecurity,
  evaluateObservability,
  evaluateGovernance,
  matchCodeowners,
  latestApprovals,
  buildReport,
};
