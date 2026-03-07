const fs = require("fs");

const { nodes, edges } = JSON.parse(
  fs.readFileSync("artifacts/pr-planner/pr-graph.json", "utf8")
);

const nodeMap = new Map(nodes.map(n => [n.number, n]));

function outgoing(n, type) {
  return edges.filter(e => e.from === n && (!type || e.type === type));
}

function incoming(n, type) {
  return edges.filter(e => e.to === n && (!type || e.type === type));
}

function descendants(root) {
  const seen = new Set();
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of edges.filter(x =>
      x.from === cur &&
      (x.type === "supersedes" || x.type === "stack_member" || x.type === "overlaps")
    )) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        stack.push(e.to);
      }
    }
  }
  seen.delete(root);
  return [...seen];
}

function score(n) {
  const desc = descendants(n.number);
  const supersedes = outgoing(n.number, "supersedes").length;
  const stack = outgoing(n.number, "stack_member").length + incoming(n.number, "stack_member").length;
  const conflictPenalty = (nodeMap.get(n.number).mergeStateStatus === "DIRTY") ? 3 : 0;
  const blockedPenalty = (nodeMap.get(n.number).mergeStateStatus === "BLOCKED") ? 2 : 0;
  return desc.length + supersedes * 2 + stack - conflictPenalty - blockedPenalty;
}

const ranked = nodes
  .map(n => ({
    pr: n.number,
    title: n.title,
    mergeStateStatus: n.mergeStateStatus,
    score: score(n),
    descendants: descendants(n.number).length
  }))
  .sort((a, b) => b.score - a.score);

const covered = new Set();
const mms = [];
const targetRemaining = 150;
const total = nodes.length;

for (const cand of ranked) {
  if (covered.has(cand.pr)) continue;

  const dom = new Set([cand.pr, ...descendants(cand.pr)]);
  const uncoveredGain = [...dom].filter(x => !covered.has(x)).length;
  if (uncoveredGain < 2) continue;

  mms.push({ ...cand, covers: uncoveredGain });
  for (const x of dom) covered.add(x);

  if (total - covered.size <= targetRemaining) break;
}

const actions = nodes.map(n => {
  const supersededBy = incoming(n.number, "supersedes")[0]?.from || null;
  const stackParent = incoming(n.number, "stack_member")[0]?.from || null;
  const isMMS = mms.some(x => x.pr === n.number);

  let action = "manual-review";
  let reason = "unclassified";

  if (isMMS) {
    action = "merge-first";
    reason = "minimum-merge-set-root";
  } else if (supersededBy) {
    action = "obsolete-after-root-merge";
    reason = `superseded-by-${supersededBy}`;
  } else if (stackParent) {
    action = "flatten-into-stack-root";
    reason = `stack-member-of-${stackParent}`;
  } else if (n.mergeStateStatus === "CLEAN" || n.mergeable === "MERGEABLE") {
    action = "merge-later";
    reason = "independent-and-clean";
  } else if (n.mergeStateStatus === "DIRTY") {
    action = "rebase-after-root-cycle";
    reason = "conflict-likely-reduced-after-roots";
  }

  return {
    pr: n.number,
    title: n.title,
    action,
    reason
  };
});

fs.writeFileSync(
  "artifacts/pr-planner/minimum_merge_set.json",
  JSON.stringify(mms, null, 2)
);

fs.writeFileSync(
  "artifacts/pr-planner/pr_actions.json",
  JSON.stringify(actions, null, 2)
);
