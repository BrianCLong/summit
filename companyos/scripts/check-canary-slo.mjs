#!/usr/bin/env node
/* eslint-disable no-console */
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import yaml from "js-yaml";

const PROM_URL =
  process.env.PROM_URL || "http://prometheus:9090/api/v1/query";

const SERVICE = process.env.SERVICE || "companyos-api";
const BASELINE = process.env.BASELINE_WINDOW || "60m";
const ERROR_FACTOR = Number(process.env.CANARY_ERROR_FACTOR || "2");
const LATENCY_FACTOR = Number(process.env.CANARY_LATENCY_FACTOR || "2");
const SLO_FILE =
  process.env.SLO_FILE || "observability/slo/companyos-api.slo.yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function loadSloConfig() {
  const sloPath = path.isAbsolute(SLO_FILE)
    ? SLO_FILE
    : path.join(__dirname, "..", "..", SLO_FILE);
  const file = await readFile(sloPath, "utf8");
  const config = yaml.load(file);
  if (!config?.slos) {
    throw new Error(`Invalid SLO file: missing slos in ${sloPath}`);
  }
  const availability = config.slos.find(slo => slo.name === "availability");
  const latency = config.slos.find(slo => slo.name === "latency_p95");
  const canary = config.canary_thresholds || {};

  return {
    evaluationWindow: canary.evaluation_window || "10m",
    errorFactor: canary.error_rate_factor || ERROR_FACTOR,
    latencyFactor: canary.latency_factor || LATENCY_FACTOR,
    availability,
    latency
  };
}

function buildErrorQueries(window) {
  return [
    `(
      sum(rate(http_requests_total{job="${SERVICE}",status_code=~"5.."}[${window}]))
    )
    /
    (
      sum(rate(http_requests_total{job="${SERVICE}"}[${window}]))
    )`,
    `(
      sum(rate(http_requests_total{job="${SERVICE}",status_code=~"5.."}[${BASELINE}]))
    )
    /
    (
      sum(rate(http_requests_total{job="${SERVICE}"}[${BASELINE}]))
    )`
  ];
}

function buildLatencyQueries(window) {
  return [
    `histogram_quantile(
      0.95,
      sum by (le) (
        rate(http_request_duration_seconds_bucket{job="${SERVICE}"}[${window}])
      )
    )`,
    `histogram_quantile(
      0.95,
      sum by (le) (
        rate(http_request_duration_seconds_bucket{job="${SERVICE}"}[${BASELINE}])
      )
    )`
  ];
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

async function evaluate(errorNow, errorBaseline, targetErrorRate, errorFactor) {
  const problems = [];
  if (errorBaseline != null && errorNow != null) {
    if (targetErrorRate && errorNow > targetErrorRate) {
      problems.push(
        `Error rate ${formatPercent(errorNow)} exceeds SLO target ${formatPercent(
          targetErrorRate
        )}`
      );
    }

    if (errorBaseline === 0 && errorNow > 0.02) {
      problems.push(
        `Error rate went from ~0 to ${formatPercent(errorNow)} (absolute threshold 2%)`
      );
    } else if (errorBaseline > 0 && errorNow > errorBaseline * errorFactor) {
      problems.push(
        `Error rate ratio exceeded: now=${formatPercent(
          errorNow
        )}, baseline=${formatPercent(errorBaseline)}, factor=${errorFactor}`
      );
    }
  }
  return problems;
}

async function evaluateLatency(latNow, latBaseline, targetMs, latencyFactor) {
  const problems = [];
  if (latBaseline != null && latNow != null) {
    if (targetMs && latNow * 1000 > targetMs) {
      problems.push(
        `p95 latency ${Math.round(latNow * 1000)}ms exceeds target ${targetMs}ms`
      );
    }
    if (latBaseline === 0 && latNow > 0.3) {
      problems.push(
        `Latency went from ~0 to ${(latNow * 1000).toFixed(
          1
        )}ms (absolute threshold 300ms)`
      );
    } else if (latBaseline > 0 && latNow > latBaseline * latencyFactor) {
      problems.push(
        `Latency ratio exceeded: now=${(latNow * 1000).toFixed(
          1
        )}ms, baseline=${(latBaseline * 1000).toFixed(1)}ms, factor=${latencyFactor}`
      );
    }
  }
  return problems;
}

async function main() {
  const { evaluationWindow, availability, latency, errorFactor, latencyFactor } =
    await loadSloConfig();

  console.log(
    `Checking canary SLOs for ${SERVICE} (window=${evaluationWindow}, baseline=${BASELINE})...`
  );

  const [errorNowQuery, errorBaselineQuery] = buildErrorQueries(evaluationWindow);
  const [latencyNowQuery, latencyBaselineQuery] = buildLatencyQueries(
    evaluationWindow
  );

  const [errorNow, errorBaseline, latNow, latBaseline] = await Promise.all([
    promQuery(errorNowQuery),
    promQuery(errorBaselineQuery),
    promQuery(latencyNowQuery),
    promQuery(latencyBaselineQuery)
  ]);

  console.log(
    `Error rate now=${errorNow ?? "N/A"}, baseline=${errorBaseline ?? "N/A"}`
  );
  console.log(
    `Latency p95 now=${latNow ?? "N/A"}s, baseline=${latBaseline ?? "N/A"}s`
  );

  const problems = [
    ...(await evaluate(
      errorNow,
      errorBaseline,
      availability ? 1 - availability.objective : null,
      errorFactor
    )),
    ...(await evaluateLatency(
      latNow,
      latBaseline,
      latency?.target_ms,
      latencyFactor
    ))
  ];

  if (problems.length) {
    console.error("❌ Canary SLO check failed:");
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }

  console.log("✅ Canary SLO check passed.");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Canary SLO check error:", err);
  process.exit(1);
});
