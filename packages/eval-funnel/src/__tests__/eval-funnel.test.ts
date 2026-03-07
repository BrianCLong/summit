import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, tmpdir } from "node:path";
import { CustomerPackGenerator } from "../packGenerator";
import { KpiReportGenerator } from "../kpiReporter";
import { ClaimChartBuilder } from "../claimChart";
import { ConnectorCertificationHarness } from "../connectorCertification";
import { MultiEvalProvisioner } from "../provisioner";
import {
  ClaimChart,
  ConnectorContract,
  CustomerPackSpec,
  EvalCustomer,
  KpiSample,
  ProvisioningCommandTemplate,
  ProvisioningExecutor,
} from "../types";

afterEach(() => {
  jest.restoreAllMocks();
});

class MockExecutor implements ProvisioningExecutor {
  constructor(private readonly shouldFail = false) {}

  async execute(command: string): Promise<{ stdout: string; stderr: string }> {
    if (this.shouldFail && command.includes("fail-me")) {
      throw new Error("provisioning failed");
    }
    return { stdout: `ran:${command}`, stderr: "" };
  }
}

describe("MultiEvalProvisioner", () => {
  it("provisions multiple customers with templated commands and writes artifacts", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "eval-funnel-"));
    const executor = new MockExecutor();
    const provisioner = new MultiEvalProvisioner(executor);
    const customers: EvalCustomer[] = [
      { id: "cust1", name: "A", templateValues: { CLUSTER: "west" } },
      { id: "cust2", name: "B", templateValues: { CLUSTER: "east" } },
    ];
    const template: ProvisioningCommandTemplate = {
      command: "provision --env {{env}} --cluster {{CLUSTER}}",
    };

    const results = await provisioner.provision(customers, template, {
      artifactRoot: tempDir,
      dryRun: true,
    });

    expect(results).toHaveLength(2);
    expect(results[0].stdout).toContain("[dry-run] provision --env eval-cust1 --cluster west");
    const artifact = readFileSync(join(tempDir, "eval-cust1", "provisioning.json"), "utf8");
    expect(JSON.parse(artifact).environmentName).toBe("eval-cust1");
  });

  it("marks failures when executor throws", async () => {
    const executor = new MockExecutor(true);
    const provisioner = new MultiEvalProvisioner(executor);
    const customers: EvalCustomer[] = [
      { id: "cust3", name: "C", templateValues: { CLUSTER: "west" } },
    ];
    const template: ProvisioningCommandTemplate = { command: "fail-me" };

    const results = await provisioner.provision(customers, template, { dryRun: false });

    expect(results[0].status).toBe("failed");
    expect(results[0].stderr).toContain("provisioning failed");
  });
});

describe("CustomerPackGenerator", () => {
  it("renders placeholders and generates configs", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "pack-"));
    const templateDir = join(tempDir, "template");
    const outputDir = join(tempDir, "output");
    const placeholders = { NAME: "Acme", CLUSTER: "us-east-1" };
    const readme = "# {{NAME}} Pack";
    const config = '{"cluster":"{{CLUSTER}}"}';
    const fs = require("node:fs");
    fs.mkdirSync(templateDir, { recursive: true });
    fs.writeFileSync(join(templateDir, "README.md"), readme);
    fs.writeFileSync(join(templateDir, "config.json"), config);

    const spec: CustomerPackSpec = {
      customerId: "cust1",
      templateDir,
      outputDir,
      placeholders,
      config: { docs: true },
      documentationBlocks: ["SLO: 99% success"],
    };

    const generator = new CustomerPackGenerator();
    const [result] = generator.generate([spec]);

    expect(result.bundlePath).toBe(join(outputDir, "cust1"));
    const rendered = readFileSync(join(result.bundlePath, "README.md"), "utf8");
    expect(rendered).toContain("# Acme Pack");
    const generatedConfig = JSON.parse(
      readFileSync(join(result.bundlePath, "config.generated.json"), "utf8")
    );
    expect(generatedConfig.docs).toBe(true);
    const additionalNotes = readFileSync(join(result.bundlePath, "ADDITIONAL_NOTES.md"), "utf8");
    expect(additionalNotes).toContain("SLO: 99% success");
    rmSync(tempDir, { recursive: true, force: true });
  });
});

describe("KpiReportGenerator", () => {
  it("produces HTML with SLA/SLO and incident template", () => {
    const generator = new KpiReportGenerator();
    const metrics: KpiSample[] = [{ name: "Provisioning Success", value: 10, target: 10 }];
    const report = generator.generate(metrics, {
      format: "html",
      includeIncidentTemplate: true,
      sloObjectives: [{ name: "Availability", threshold: 99.0, measured: 99.5, unit: "%" }],
    });

    expect(report.content).toContain("Weekly KPI Report");
    expect(report.content).toContain("Incident Postmortem Template");
    expect(report.content).toContain("Availability");
  });
});

describe("ClaimChartBuilder", () => {
  it("stores charts and rejects duplicates", () => {
    const builder = new ClaimChartBuilder();
    const chart: ClaimChart = {
      competitor: "CompetitorA",
      archetype: "Robustness",
      elements: [
        {
          id: "c1",
          statement: "Handles isolated namespaces",
          behaviorMapping: "Namespace policy enforced by provisioner",
          evidencePath: "/logs/namespace.txt",
        },
      ],
    };

    builder.addChart(chart);
    expect(builder.findByCompetitor("CompetitorA")).toHaveLength(1);
    expect(() => builder.addElement("CompetitorA", "Robustness", { ...chart.elements[0] })).toThrow(
      "Duplicate"
    );
  });
});

describe("ConnectorCertificationHarness", () => {
  it("validates schema compatibility and surfaces failures", async () => {
    const harness = new ConnectorCertificationHarness("1.0.0");
    const connectors: ConnectorContract[] = [
      { name: "alpha", schemaVersion: "1.0.0", run: async () => ({ passed: true }) },
      { name: "beta", schemaVersion: "1.0.0", run: async () => ({ passed: true }) },
    ];

    const results = await harness.certify(connectors);
    expect(results.every((r) => r.passed)).toBe(true);
    expect(results[0].schemaVersion).toBe("1.0.0");

    const badHarness = new ConnectorCertificationHarness("2.0.0");
    await expect(badHarness.certify(connectors)).rejects.toThrow("Connector schema mismatch");
  });
});
