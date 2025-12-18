#!/usr/bin/env node
/* eslint-disable no-console */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fetch from "node-fetch";
import YAML from "yaml";

const PROM_URL =
  process.env.PROM_URL || "http://prometheus:9090/api/v1/query";

const SERVICE = process.env.SERVICE || "companyos-api";
const FALLBACK_WINDOW = "10m";
const BASELINE = process.env.BASELINE_WINDOW || "60m";
const FALLBACK_ERROR_FACTOR = 2;
const FALLBACK_LATENCY_FACTOR = 2;
const FALLBACK_LATENCY_ABS = 0.3; // 300ms
const FALLBACK_ERROR_ABS = 0.02; // 2%
const FALLBACK_AVAILABILITY = 0.995; // 99.5%

const DEFAULT_SLO_CONFIG = process.env.SLO_CONFIG_PATH
  ? resolve(process.env.SLO_CONFIG_PATH)
  : resolve(
      process.cwd(),
      "observability",
      "slo",
      `${SERVICE}.slo.yaml`
    );

async function loadSloConfig() {
  try {
    const raw = await readFile(DEFAULT_SLO_CONFIG, "utf8");
    return YAML.parse(raw) || {};
  } catch (err) {
    console.warn(
      `⚠️  Could not load SLO config at ${DEFAULT_SLO_CONFIG}; using defaults`,
      err?.message
    );
    return {};
  }
}

function extractAvailabilityObjective(sloConfig) {
  if (!sloConfig?.slos) return FALLBACK_AVAILABILITY;
  const availability = sloConfig.slos.find(slo => slo.name === "availability");
  return Number(availability?.objective) || FALLBACK_AVAILABILITY;
}

function resolveThresholds(sloConfig) {
  const canaryThresholds = sloConfig.canary_thresholds || {};
  return {
    window:
      process.env.CANARY_WINDOW ||
      canaryThresholds.evaluation_window ||
      FALLBACK_WINDOW,
    baseline: BASELINE,
    errorFactor:
      Number(process.env.CANARY_ERROR_FACTOR) ||
      Number(canaryThresholds.error_rate_factor) ||
      FALLBACK_ERROR_FACTOR,
    latencyFactor:
      Number(process.env.CANARY_LATENCY_FACTOR) ||
      Number(canaryThresholds.latency_factor) ||
      FALLBACK_LATENCY_FACTOR,
    latencyAbsoluteLimitSec:
      Number(canaryThresholds.latency_abs_seconds) || FALLBACK_LATENCY_ABS,
    errorAbsoluteLimit:
      Number(canaryThresholds.error_rate_abs) || FALLBACK_ERROR_ABS,
    availabilityObjective: extractAvailabilityObjective(sloConfig)
  };
}

function buildQueries(service, window, baseline) {
  return {
    errorNow: `
    (
      sum(rate(http_requests_total{job="${service}",status_code=~"5.."}[${window}]))
    )
    /
    (
      sum(rate(http_requests_total{job="${service}"}[${window}]))
    )
  `,
    errorBaseline: `
    (
      sum(rate(http_requests_total{job="${service}",status_code=~"5.."}[${baseline}]))
    )
    /
    (
      sum(rate(http_requests_total{job="${service}"}[${baseline}]))
    )
  `,
    latencyNow: `
    histogram_quantile(
      0.95,
      sum by (le) (
        rate(http_request_duration_seconds_bucket{job="${service}"}[${window}])
      )
    )
  `,
    latencyBaseline: `
    histogram_quantile(
      0.95,
      sum by (le) (
        rate(http_request_duration_seconds_bucket{job="${service}"}[${baseline}])
      )
    )
  `,
    availabilityNow: `
    (
      sum(rate(http_requests_total{job="${service}",status_code!~"5.."}[${window}]))
    )
    /
    (
      sum(rate(http_requests_total{job="${service}"}[${window}]))
    )
  `
  };
}

async function promQuery(query) {
  const url = `${PROM_URL}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Prometheus query failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (body.status !== "success") {
    throw new Error(`Prometheus error: ${JSON.stringify(body)}`);
  }
  const result = body.data.result;
  if (!result.length) return null;
  return Number(result[0].value[1]);
}

function evaluateCanary(metrics, thresholds) {
  const problems = [];

  if (metrics.errorBaseline != null && metrics.errorNow != null) {
    if (metrics.errorBaseline === 0 && metrics.errorNow > thresholds.errorAbsoluteLimit) {
      problems.push(
        `Error rate went from ~0 to ${metrics.errorNow.toFixed(
          4
        )} (absolute threshold ${(thresholds.errorAbsoluteLimit * 100).toFixed(1)}%)`
      );
    } else if (
      metrics.errorBaseline > 0 &&
      metrics.errorNow > metrics.errorBaseline * thresholds.errorFactor
    ) {
      problems.push(
        `Error rate ratio exceeded: now=${metrics.errorNow.toFixed(
          4
        )}, baseline=${metrics.errorBaseline.toFixed(4)}, factor=${thresholds.errorFactor}`
      );
    }
  }

  if (metrics.latencyBaseline != null && metrics.latencyNow != null) {
    if (
      metrics.latencyBaseline === 0 &&
      metrics.latencyNow > thresholds.latencyAbsoluteLimitSec
    ) {
      problems.push(
        `Latency went from ~0 to ${metrics.latencyNow.toFixed(
          3
        )}s (absolute threshold ${(thresholds.latencyAbsoluteLimitSec * 1000).toFixed(0)}ms)`
      );
    } else if (
      metrics.latencyBaseline > 0 &&
      metrics.latencyNow > metrics.latencyBaseline * thresholds.latencyFactor
    ) {
      problems.push(
        `Latency ratio exceeded: now=${metrics.latencyNow.toFixed(
          3
        )}s, baseline=${metrics.latencyBaseline.toFixed(
          3
        )}s, factor=${thresholds.latencyFactor}`
      );
    }
  }

  if (metrics.availabilityNow != null) {
    if (metrics.availabilityNow < thresholds.availabilityObjective) {
      problems.push(
        `Availability ${metrics.availabilityNow.toFixed(
          4
        )} is below objective ${thresholds.availabilityObjective}`
      );
    }
  }

  return problems;
}

async function main() {
  const sloConfig = await loadSloConfig();
  const thresholds = resolveThresholds(sloConfig);

  console.log(
    `Checking canary SLOs for ${SERVICE} using window ${thresholds.window} (baseline ${thresholds.baseline})...`
  );

  const queries = buildQueries(SERVICE, thresholds.window, thresholds.baseline);

  const [errorNow, errorBaseline, latNow, latBaseline, availabilityNow] =
    await Promise.all([
      promQuery(queries.errorNow),
      promQuery(queries.errorBaseline),
      promQuery(queries.latencyNow),
      promQuery(queries.latencyBaseline),
      promQuery(queries.availabilityNow)
    ]);

  const metrics = {
    errorNow,
    errorBaseline,
    latencyNow: latNow,
    latencyBaseline: latBaseline,
    availabilityNow
  };

  console.log(
    `Error rate now=${errorNow ?? "N/A"}, baseline=${errorBaseline ?? "N/A"}`
  );
  console.log(
    `Latency p95 now=${latNow ?? "N/A"}s, baseline=${latBaseline ?? "N/A"}s`
  );
  console.log(
    `Availability now=${availabilityNow ?? "N/A"}, objective=${thresholds.availabilityObjective}`
  );

  const problems = evaluateCanary(metrics, thresholds);

  if (problems.length) {
    console.error("❌ Canary SLO check failed:");
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }

  console.log("✅ Canary SLO check passed.");
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error("❌ Canary SLO check error:", err);
    process.exit(1);
  });
}

export {
  buildQueries,
  evaluateCanary,
  extractAvailabilityObjective,
  loadSloConfig,
  resolveThresholds
};
