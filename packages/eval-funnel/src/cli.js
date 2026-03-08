#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const packGenerator_1 = require("./packGenerator");
const kpiReporter_1 = require("./kpiReporter");
const provisioner_1 = require("./provisioner");
const claimChart_1 = require("./claimChart");
const connectorCertification_1 = require("./connectorCertification");
function loadConfig(path) {
    const resolved = (0, node_path_1.resolve)(path);
    return JSON.parse((0, node_fs_1.readFileSync)(resolved, 'utf8'));
}
async function main() {
    const configPath = process.argv[2];
    if (!configPath) {
        console.error('Usage: eval-funnel <config.json>');
        process.exit(1);
    }
    const config = loadConfig(configPath);
    const provisioner = new provisioner_1.MultiEvalProvisioner();
    const provisioningResults = await provisioner.provision(config.customers, config.provisioning, config.provisioningOptions);
    console.log(JSON.stringify({ provisioningResults }, null, 2));
    if (config.packs?.length) {
        const generator = new packGenerator_1.CustomerPackGenerator();
        const packs = generator.generate(config.packs);
        console.log(JSON.stringify({ packs }, null, 2));
    }
    if (config.kpis) {
        const kpiGenerator = new kpiReporter_1.KpiReportGenerator();
        const report = kpiGenerator.generate(config.kpis.metrics, config.kpis.options);
        console.log(report.content);
    }
    if (config.claimCharts?.length) {
        const builder = new claimChart_1.ClaimChartBuilder();
        for (const chart of config.claimCharts) {
            builder.addChart(chart);
        }
        console.log(JSON.stringify({ claimCharts: builder.list() }, null, 2));
    }
    if (config.connectors) {
        const harness = new connectorCertification_1.ConnectorCertificationHarness(config.connectors.schemaVersion);
        const results = await harness.certify(config.connectors.contracts);
        console.log(JSON.stringify({ connectorCertification: results }, null, 2));
    }
}
void main();
