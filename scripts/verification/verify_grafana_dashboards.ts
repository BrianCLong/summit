import fs from "fs";
import path from "path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function error(msg: string) {
  console.error(`${RED}ERROR: ${msg}${RESET}`);
  process.exitCode = 1;
}

function success(msg: string) {
  console.log(`${GREEN}PASS: ${msg}${RESET}`);
}

const DASHBOARD_DIRS = [
  "observability/dashboards",
  "monitoring/dashboards",
  "ops/observability/grafana",
  "monitoring/grafana/dashboards",
];

function findJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else {
      if (file.endsWith(".json")) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const FILES: string[] = [];
DASHBOARD_DIRS.forEach((d) => {
  FILES.push(...findJsonFiles(d));
});

console.log(`Verifying ${FILES.length} Grafana dashboard files...`);

let failure = false;

FILES.forEach((file) => {
  try {
    const content = fs.readFileSync(file, "utf8");
    const doc = JSON.parse(content);

    // Some dashboards are wrapped in a "dashboard" key, some are flat.
    let dashboard = doc;
    if (doc.dashboard) {
      dashboard = doc.dashboard;
    }

    if (!dashboard.title) {
      error(`${file}: Missing 'title'`);
      failure = true;
    }

    if (!dashboard.panels && !dashboard.rows) {
      if (!dashboard.schemaVersion && !dashboard.uid) {
        error(`${file}: Missing 'panels', 'rows', or 'uid' - is this a dashboard?`);
        failure = true;
      }
    }

    if (!failure) success(`${file} OK`);
  } catch (e: any) {
    error(`${file}: ${e.message}`);
    failure = true;
  }
});

if (failure) {
  process.exit(1);
}
