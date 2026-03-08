const fs = require("fs");

const prs = JSON.parse(fs.readFileSync("artifacts/pr-planner/prs.json", "utf8"));

function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union;
}

function titleSimilarity(a, b) {
  const ta = new Set(norm(a).split(/\s+/).filter(Boolean));
  const tb = new Set(norm(b).split(/\s+/).filter(Boolean));
  return jaccard([...ta], [...tb]);
}

const nodes = prs.map(pr => ({
  number: pr.number,
  title: pr.title,
  headRefName: pr.headRefName,
  updatedAt: pr.updatedAt,
  mergeable: pr.mergeable,
  mergeStateStatus: pr.mergeStateStatus,
  files: (pr.files || []).map(f => f.path || f),
}));

const edges = [];

for (let i = 0; i < nodes.length; i++) {
  for (let j = 0; j < nodes.length; j++) {
    if (i === j) continue;
    const a = nodes[i];
    const b = nodes[j];

    const fileOverlap = jaccard(a.files, b.files);
    const titleSim = titleSimilarity(a.title, b.title);

    const sameBranchFamily =
      a.headRefName && b.headRefName &&
      (a.headRefName.startsWith(b.headRefName) || b.headRefName.startsWith(a.headRefName));

    if (fileOverlap >= 0.35) {
      edges.push({ from: a.number, to: b.number, type: "overlaps", weight: fileOverlap });
    }

    if (sameBranchFamily) {
      edges.push({ from: a.number, to: b.number, type: "stack_member", weight: 1.0 });
    }

    if (titleSim >= 0.55 && fileOverlap >= 0.25) {
      const newer = new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b;
      const older = newer.number === a.number ? b : a;
      edges.push({ from: newer.number, to: older.number, type: "supersedes", weight: (titleSim + fileOverlap) / 2 });
    }
  }
}

fs.writeFileSync(
  "artifacts/pr-planner/pr-graph.json",
  JSON.stringify({ nodes, edges }, null, 2)
);
