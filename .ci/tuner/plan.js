import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const appendOutput = (key, value) => {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  } else {
    console.log(`${key}=${value}`);
  }
};

function loadState() {
  const statsPath = path.join(".ci", "state", "stats.json");
  try {
    const content = fs.readFileSync(statsPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.log(`No prior state found at ${statsPath}: ${error.message}`);
    return {};
  }
}

function computeMatrix(stats) {
  const fast = (stats.avg_total_min ?? 12) < 8;
  const flaky = (stats.flaky_rate ?? 0) > 0.05;
  const base = ["18", "20"];
  const plus = fast && !flaky ? ["22"] : [];
  return JSON.stringify(base.concat(plus));
}

function computeParallel(stats) {
  const queueDelay = stats.avg_queue_sec ?? 20;
  const cpu = stats.avg_cpu ?? 0.7;
  const target = queueDelay > 60 ? 2 : cpu > 0.85 ? 3 : 6;
  return JSON.stringify(target);
}

function cacheLevel(stats) {
  const missCost = stats.last_cache_miss_minutes ?? 0;
  return missCost > 5 ? "L2" : "L1";
}

function changedPackages() {
  try {
    const diff = execSync("git diff --name-only origin/main...HEAD", {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const packages = Array.from(
      new Set(
        diff
          .filter((file) => file.startsWith("packages/"))
          .map((file) => file.split("/").slice(0, 2).join("/"))
      )
    );

    return packages.length ? packages.join(" ") : "...";
  } catch (error) {
    console.log(`Falling back to full workspace filter: ${error.message}`);
    return "...";
  }
}

function testShards(stats) {
  const p95 = stats.test_p95_min ?? 12;
  const total = Math.max(2, Math.min(10, Math.ceil(p95 / 3)));
  return JSON.stringify(
    Array.from({ length: total }).map((_, index) => ({
      index: index + 1,
      total,
    }))
  );
}

function needsGraph(stats) {
  return (stats.graph_churn_rate ?? 0) > 0.2 ? "true" : "false";
}

const state = loadState();
appendOutput("node_matrix", computeMatrix(state));
appendOutput("max_parallel", computeParallel(state));
appendOutput("cache_level", cacheLevel(state));
appendOutput("test_shard", testShards(state));
appendOutput("changed_pkgs", changedPackages());
appendOutput("needs_graph", needsGraph(state));
