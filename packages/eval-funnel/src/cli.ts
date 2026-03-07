#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CustomerPackGenerator } from "./packGenerator";
import { KpiReportGenerator } from "./kpiReporter";
import { MultiEvalProvisioner } from "./provisioner";
import { ClaimChartBuilder } from "./claimChart";
import { ConnectorCertificationHarness } from "./connectorCertification";
import {
  ClaimChart,
  ConnectorContract,
  CustomerPackSpec,
  EvalCustomer,
  KpiReportOptions,
  KpiSample,
  ProvisioningCommandTemplate,
  ProvisioningOptions,
} from "./types";

interface CliConfig {
  customers: EvalCustomer[];
  provisioning: ProvisioningCommandTemplate;
  provisioningOptions?: ProvisioningOptions;
  packs?: CustomerPackSpec[];
  kpis?: { metrics: KpiSample[]; options: KpiReportOptions };
  claimCharts?: ClaimChart[];
  connectors?: { schemaVersion: string; contracts: ConnectorContract[] };
}

function loadConfig(path: string): CliConfig {
  const resolved = resolve(path);
  return JSON.parse(readFileSync(resolved, "utf8")) as CliConfig;
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: eval-funnel <config.json>");
    process.exit(1);
  }

  const config = loadConfig(configPath);
  const provisioner = new MultiEvalProvisioner();
  const provisioningResults = await provisioner.provision(
    config.customers,
    config.provisioning,
    config.provisioningOptions
  );
  console.log(JSON.stringify({ provisioningResults }, null, 2));

  if (config.packs?.length) {
    const generator = new CustomerPackGenerator();
    const packs = generator.generate(config.packs);
    console.log(JSON.stringify({ packs }, null, 2));
  }

  if (config.kpis) {
    const kpiGenerator = new KpiReportGenerator();
    const report = kpiGenerator.generate(config.kpis.metrics, config.kpis.options);
    console.log(report.content);
  }

  if (config.claimCharts?.length) {
    const builder = new ClaimChartBuilder();
    for (const chart of config.claimCharts) {
      builder.addChart(chart);
    }
    console.log(JSON.stringify({ claimCharts: builder.list() }, null, 2));
  }

  if (config.connectors) {
    const harness = new ConnectorCertificationHarness(config.connectors.schemaVersion);
    const results = await harness.certify(config.connectors.contracts);
    console.log(JSON.stringify({ connectorCertification: results }, null, 2));
  }
}

void main();
