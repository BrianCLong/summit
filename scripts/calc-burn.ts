import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

export interface AlertWindow {
  window: string;
  burn_rate: number;
}

export interface SLODefinition {
  name: string;
  description?: string;
  indicator: string;
  objective: number;
  window_days: number;
  threshold?: Record<string, unknown>;
  alert_windows?: AlertWindow[];
}

export interface BudgetFile {
  service: string;
  version?: string;
  owner?: string;
  summary?: string;
  slo_policy?: string;
  slos: SLODefinition[];
}

export interface MeasurementInput {
  slo: string;
  window: string;
  good: number;
  total: number;
}

export interface MetricsInput {
  service: string;
  generatedAt: string;
  measurements: MeasurementInput[];
}

export interface BurnWindowReport {
  window: string;
  good: number;
  total: number;
  errorRate: number;
  burnRate: number;
  budgetRemaining: number;
}

export interface BurnSLOReport {
  name: string;
  indicator: string;
  objective: number;
  window_days: number;
  errorBudget: number;
  alert_windows: AlertWindow[];
  windows: BurnWindowReport[];
  aggregate: {
    totalGood: number;
    totalCount: number;
    errorRate: number;
    burnRate: number;
    budgetRemaining: number;
  };
}

export interface BurnReport {
  service: string;
  generatedAt: string;
  version?: string;
  slos: BurnSLOReport[];
}

function ensureNumber(value: unknown, message: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }
  return value;
}

export function loadBudget(filePath: string): BudgetFile {
  const raw = fs.readFileSync(filePath, "utf8");
  const ext = path.extname(filePath).toLowerCase();
  const parsed = ext === ".yaml" || ext === ".yml" ? yaml.load(raw) : JSON.parse(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Budget file must contain an object");
  }

  const budget = parsed as BudgetFile;

  if (!budget.service) {
    throw new Error("Budget file is missing required field: service");
  }
  if (!Array.isArray(budget.slos) || budget.slos.length === 0) {
    throw new Error("Budget file must define at least one SLO");
  }

  budget.slos = budget.slos.map((slo) => {
    const objective = ensureNumber(slo.objective, `SLO ${slo.name} objective must be numeric`);
    if (objective <= 0 || objective >= 1) {
      throw new Error(`SLO ${slo.name} objective must be a decimal between 0 and 1`);
    }
    const windowDays = ensureNumber(slo.window_days, `SLO ${slo.name} window_days must be numeric`);
    if (windowDays <= 0) {
      throw new Error(`SLO ${slo.name} window_days must be positive`);
    }
    return {
      ...slo,
      objective,
      window_days: windowDays,
      alert_windows: (slo.alert_windows ?? []).map((aw) => ({
        window: aw.window,
        burn_rate: ensureNumber(
          aw.burn_rate,
          `SLO ${slo.name} alert window burn_rate must be numeric`
        ),
      })),
    } satisfies SLODefinition;
  });

  return budget;
}

export function loadMetrics(filePath: string): MetricsInput {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as MetricsInput;
  if (!parsed.service) {
    throw new Error("Metrics input missing service");
  }
  if (!Array.isArray(parsed.measurements)) {
    throw new Error("Metrics input missing measurements");
  }

  parsed.measurements = parsed.measurements.map((m) => ({
    ...m,
    good: ensureNumber(m.good, "Measurement good must be numeric"),
    total: ensureNumber(m.total, "Measurement total must be numeric"),
  }));

  return parsed;
}

function computeBurn(errorRate: number, errorBudget: number): number {
  if (errorBudget <= 0) {
    return Infinity;
  }
  return errorRate / errorBudget;
}

function computeBudgetRemaining(errorRate: number, errorBudget: number): number {
  const burn = computeBurn(errorRate, errorBudget);
  const remaining = 1 - burn;
  return remaining < 0 ? 0 : remaining;
}

export function calculateBurnReport(budget: BudgetFile, metrics: MetricsInput): BurnReport {
  if (budget.service !== metrics.service) {
    throw new Error(
      `Service mismatch between budget (${budget.service}) and metrics (${metrics.service})`
    );
  }

  const generatedAt = metrics.generatedAt || new Date().toISOString();

  const slos = budget.slos.map((slo) => {
    const errorBudget = 1 - slo.objective;
    const windows = metrics.measurements
      .filter((m) => m.slo === slo.name)
      .map((measurement) => {
        const errorRate =
          measurement.total === 0 ? 0 : (measurement.total - measurement.good) / measurement.total;
        const burnRate = computeBurn(errorRate, errorBudget);
        const budgetRemaining = computeBudgetRemaining(errorRate, errorBudget);
        return {
          window: measurement.window,
          good: measurement.good,
          total: measurement.total,
          errorRate,
          burnRate,
          budgetRemaining,
        } satisfies BurnWindowReport;
      })
      .sort((a, b) => a.window.localeCompare(b.window));

    const aggregateGood = windows.reduce((acc, item) => acc + item.good, 0);
    const aggregateTotal = windows.reduce((acc, item) => acc + item.total, 0);
    const aggregateErrorRate =
      aggregateTotal === 0 ? 0 : (aggregateTotal - aggregateGood) / aggregateTotal;
    const aggregateBurn = computeBurn(aggregateErrorRate, errorBudget);

    return {
      name: slo.name,
      indicator: slo.indicator,
      objective: slo.objective,
      window_days: slo.window_days,
      errorBudget,
      alert_windows: slo.alert_windows ?? [],
      windows,
      aggregate: {
        totalGood: aggregateGood,
        totalCount: aggregateTotal,
        errorRate: aggregateErrorRate,
        burnRate: aggregateBurn,
        budgetRemaining: computeBudgetRemaining(aggregateErrorRate, errorBudget),
      },
    } satisfies BurnSLOReport;
  });

  return {
    service: budget.service,
    generatedAt,
    version: budget.version,
    slos,
  } satisfies BurnReport;
}

function runCli(): void {
  const [, , budgetPath, metricsPath] = process.argv;
  if (!budgetPath || !metricsPath) {
    console.error("Usage: ts-node scripts/calc-burn.ts <budget-file> <metrics-input.json>");
    process.exit(1);
  }

  const budget = loadBudget(path.resolve(budgetPath));
  const metrics = loadMetrics(path.resolve(metricsPath));
  const report = calculateBurnReport(budget, metrics);
  console.log(JSON.stringify(report, null, 2));
}

const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (isMain) {
  runCli();
}
