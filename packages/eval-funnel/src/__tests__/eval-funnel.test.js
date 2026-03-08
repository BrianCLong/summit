"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const packGenerator_1 = require("../packGenerator");
const kpiReporter_1 = require("../kpiReporter");
const claimChart_1 = require("../claimChart");
const connectorCertification_1 = require("../connectorCertification");
const provisioner_1 = require("../provisioner");
afterEach(() => {
    jest.restoreAllMocks();
});
class MockExecutor {
    shouldFail;
    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
    }
    async execute(command) {
        if (this.shouldFail && command.includes('fail-me')) {
            throw new Error('provisioning failed');
        }
        return { stdout: `ran:${command}`, stderr: '' };
    }
}
describe('MultiEvalProvisioner', () => {
    it('provisions multiple customers with templated commands and writes artifacts', async () => {
        const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_path_1.tmpdir)(), 'eval-funnel-'));
        const executor = new MockExecutor();
        const provisioner = new provisioner_1.MultiEvalProvisioner(executor);
        const customers = [
            { id: 'cust1', name: 'A', templateValues: { CLUSTER: 'west' } },
            { id: 'cust2', name: 'B', templateValues: { CLUSTER: 'east' } },
        ];
        const template = { command: 'provision --env {{env}} --cluster {{CLUSTER}}' };
        const results = await provisioner.provision(customers, template, { artifactRoot: tempDir, dryRun: true });
        expect(results).toHaveLength(2);
        expect(results[0].stdout).toContain('[dry-run] provision --env eval-cust1 --cluster west');
        const artifact = (0, node_fs_1.readFileSync)((0, node_path_1.join)(tempDir, 'eval-cust1', 'provisioning.json'), 'utf8');
        expect(JSON.parse(artifact).environmentName).toBe('eval-cust1');
    });
    it('marks failures when executor throws', async () => {
        const executor = new MockExecutor(true);
        const provisioner = new provisioner_1.MultiEvalProvisioner(executor);
        const customers = [{ id: 'cust3', name: 'C', templateValues: { CLUSTER: 'west' } }];
        const template = { command: 'fail-me' };
        const results = await provisioner.provision(customers, template, { dryRun: false });
        expect(results[0].status).toBe('failed');
        expect(results[0].stderr).toContain('provisioning failed');
    });
});
describe('CustomerPackGenerator', () => {
    it('renders placeholders and generates configs', () => {
        const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_path_1.tmpdir)(), 'pack-'));
        const templateDir = (0, node_path_1.join)(tempDir, 'template');
        const outputDir = (0, node_path_1.join)(tempDir, 'output');
        const placeholders = { NAME: 'Acme', CLUSTER: 'us-east-1' };
        const readme = '# {{NAME}} Pack';
        const config = '{"cluster":"{{CLUSTER}}"}';
        const fs = require('node:fs');
        fs.mkdirSync(templateDir, { recursive: true });
        fs.writeFileSync((0, node_path_1.join)(templateDir, 'README.md'), readme);
        fs.writeFileSync((0, node_path_1.join)(templateDir, 'config.json'), config);
        const spec = {
            customerId: 'cust1',
            templateDir,
            outputDir,
            placeholders,
            config: { docs: true },
            documentationBlocks: ['SLO: 99% success'],
        };
        const generator = new packGenerator_1.CustomerPackGenerator();
        const [result] = generator.generate([spec]);
        expect(result.bundlePath).toBe((0, node_path_1.join)(outputDir, 'cust1'));
        const rendered = (0, node_fs_1.readFileSync)((0, node_path_1.join)(result.bundlePath, 'README.md'), 'utf8');
        expect(rendered).toContain('# Acme Pack');
        const generatedConfig = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(result.bundlePath, 'config.generated.json'), 'utf8'));
        expect(generatedConfig.docs).toBe(true);
        const additionalNotes = (0, node_fs_1.readFileSync)((0, node_path_1.join)(result.bundlePath, 'ADDITIONAL_NOTES.md'), 'utf8');
        expect(additionalNotes).toContain('SLO: 99% success');
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    });
});
describe('KpiReportGenerator', () => {
    it('produces HTML with SLA/SLO and incident template', () => {
        const generator = new kpiReporter_1.KpiReportGenerator();
        const metrics = [{ name: 'Provisioning Success', value: 10, target: 10 }];
        const report = generator.generate(metrics, {
            format: 'html',
            includeIncidentTemplate: true,
            sloObjectives: [{ name: 'Availability', threshold: 99.0, measured: 99.5, unit: '%' }],
        });
        expect(report.content).toContain('Weekly KPI Report');
        expect(report.content).toContain('Incident Postmortem Template');
        expect(report.content).toContain('Availability');
    });
});
describe('ClaimChartBuilder', () => {
    it('stores charts and rejects duplicates', () => {
        const builder = new claimChart_1.ClaimChartBuilder();
        const chart = {
            competitor: 'CompetitorA',
            archetype: 'Robustness',
            elements: [
                {
                    id: 'c1',
                    statement: 'Handles isolated namespaces',
                    behaviorMapping: 'Namespace policy enforced by provisioner',
                    evidencePath: '/logs/namespace.txt',
                },
            ],
        };
        builder.addChart(chart);
        expect(builder.findByCompetitor('CompetitorA')).toHaveLength(1);
        expect(() => builder.addElement('CompetitorA', 'Robustness', { ...chart.elements[0] })).toThrow('Duplicate');
    });
});
describe('ConnectorCertificationHarness', () => {
    it('validates schema compatibility and surfaces failures', async () => {
        const harness = new connectorCertification_1.ConnectorCertificationHarness('1.0.0');
        const connectors = [
            { name: 'alpha', schemaVersion: '1.0.0', run: async () => ({ passed: true }) },
            { name: 'beta', schemaVersion: '1.0.0', run: async () => ({ passed: true }) },
        ];
        const results = await harness.certify(connectors);
        expect(results.every((r) => r.passed)).toBe(true);
        expect(results[0].schemaVersion).toBe('1.0.0');
        const badHarness = new connectorCertification_1.ConnectorCertificationHarness('2.0.0');
        await expect(badHarness.certify(connectors)).rejects.toThrow('Connector schema mismatch');
    });
});
