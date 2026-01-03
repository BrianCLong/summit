#!/usr/bin/env -S node
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT_DIR = join(__dirname, "..", "..");
const DASHBOARD_ROOT = join(ROOT_DIR, "monitoring");
const SKIP_FILES = new Set([
  "monitoring/synthetic/package.json",
]);

interface ValidationError {
  file: string;
  path: string;
  message: string;
}

type Dashboard = {
  title?: unknown;
  panels?: unknown;
  rows?: unknown;
  [key: string]: unknown;
};

type Panel = {
  title?: unknown;
  type?: unknown;
  targets?: unknown;
  panels?: unknown;
  [key: string]: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function collectJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (entry.endsWith(".json")) {
      const rel = relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
      if (!SKIP_FILES.has(rel)) {
        files.push(rel);
      }
    }
  }

  return files;
}

function parseDashboard(file: string): Dashboard {
  try {
    const raw = JSON.parse(readFileSync(join(ROOT_DIR, file), "utf-8"));
    const dashboard = (raw && typeof raw === "object" && "dashboard" in raw)
      ? (raw as { dashboard: Dashboard }).dashboard
      : (raw as Dashboard);
    return dashboard;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${file}: ${reason}`);
  }
}

function validatePanels(panels: unknown, file: string, basePath: string, errors: ValidationError[]): void {
  if (!Array.isArray(panels) || panels.length === 0) {
    errors.push({ file, path: `${basePath}/panels`, message: "panels must be a non-empty array" });
    return;
  }

  panels.forEach((panel, index) => validatePanel(panel as Panel, file, `${basePath}/panels/${index}`, errors));
}

function validateTargets(targets: unknown, file: string, basePath: string, errors: ValidationError[]): void {
  if (!Array.isArray(targets) || targets.length === 0) {
    errors.push({ file, path: `${basePath}/targets`, message: "targets must be a non-empty array" });
    return;
  }

  targets.forEach((target, index) => {
    const path = `${basePath}/targets/${index}`;
    if (!target || typeof target !== "object") {
      errors.push({ file, path, message: "target must be an object" });
      return;
    }

    const typed = target as Record<string, unknown>;
    const queryField = typed.expr ?? typed.query ?? typed.target ?? typed.rawSql ?? typed.metric;

    if (!isNonEmptyString(queryField)) {
      errors.push({ file, path: `${path}/expr`, message: "target is missing a query expression (expr/query/target/rawSql/metric)" });
    }
  });
}

function validatePanel(panel: Panel, file: string, path: string, errors: ValidationError[]): void {
  if (!panel || typeof panel !== "object") {
    errors.push({ file, path, message: "panel must be an object" });
    return;
  }

  if (!isNonEmptyString(panel.title)) {
    errors.push({ file, path: `${path}/title`, message: "panel title must be a non-empty string" });
  }

  if (!isNonEmptyString(panel.type)) {
    errors.push({ file, path: `${path}/type`, message: "panel type must be a non-empty string" });
  }

  if (Array.isArray(panel.panels) && panel.panels.length > 0) {
    validatePanels(panel.panels, file, path, errors);
    return;
  }

  const panelType = typeof panel.type === "string" ? panel.type : undefined;
  const needsTargets = panelType !== "row" && panelType !== "text" && panelType !== "table-old";

  if (needsTargets) {
    validateTargets(panel.targets, file, path, errors);
  }
}

function validateDashboard(dashboard: Dashboard, file: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isNonEmptyString(dashboard.title)) {
    errors.push({ file, path: "/title", message: "dashboard title must be a non-empty string" });
  }

  if (dashboard.panels) {
    validatePanels(dashboard.panels, file, "", errors);
  } else if (dashboard.rows) {
    // Legacy Grafana exports may still use rows; ensure each row has panels
    validatePanels((dashboard.rows as unknown), file, "", errors);
  } else {
    errors.push({ file, path: "/panels", message: "dashboard must define panels" });
  }

  return errors;
}

function main() {
  const files = collectJsonFiles(DASHBOARD_ROOT).sort();
  const allErrors: ValidationError[] = [];

  for (const file of files) {
    try {
      const dashboard = parseDashboard(file);
      const errors = validateDashboard(dashboard, file);
      allErrors.push(...errors);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      allErrors.push({ file, path: "/", message: reason });
    }
  }

  if (allErrors.length > 0) {
    console.error("Grafana dashboard validation failed:");
    for (const err of allErrors) {
      console.error(` - [${err.file}] ${err.path}: ${err.message}`);
    }
    process.exit(1);
  }

  console.log("All Grafana dashboards are well-formed.");
}

main();
