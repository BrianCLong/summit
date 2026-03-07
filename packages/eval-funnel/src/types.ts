export interface EvalCustomer {
  id: string;
  name: string;
  tenantId?: string;
  templateValues: Record<string, string>;
}

export interface ProvisioningCommandTemplate {
  command: string;
  environment?: Record<string, string>;
}

export interface ProvisioningResult {
  customerId: string;
  environmentName: string;
  startedAt: number;
  finishedAt: number;
  status: "succeeded" | "failed";
  stdout: string;
  stderr: string;
  artifactsPath: string;
}

export interface ProvisioningOptions {
  baseNamespace?: string;
  concurrency?: number;
  workingDirectory?: string;
  artifactRoot?: string;
  dryRun?: boolean;
}

export interface ProvisioningExecutor {
  execute(
    command: string,
    env?: Record<string, string>,
    cwd?: string
  ): Promise<{ stdout: string; stderr: string }>;
}

export interface CustomerPackSpec {
  customerId: string;
  templateDir: string;
  outputDir: string;
  placeholders: Record<string, string>;
  documentationBlocks?: string[];
  config?: Record<string, unknown>;
}

export interface PackGenerationResult {
  customerId: string;
  bundlePath: string;
  documents: string[];
  configs: string[];
}

export interface KpiSample {
  name: string;
  value: number;
  target: number;
  unit?: string;
  description?: string;
}

export interface KpiReportOptions {
  format: "html" | "json";
  outputPath?: string;
  includeIncidentTemplate?: boolean;
  sloObjectives?: Array<{ name: string; threshold: number; measured: number; unit?: string }>;
}

export interface ClaimElement {
  id: string;
  statement: string;
  behaviorMapping: string;
  evidencePath: string;
}

export interface ClaimChart {
  competitor: string;
  archetype: string;
  elements: ClaimElement[];
}

export interface ConnectorContract {
  name: string;
  schemaVersion: string;
  run: () => Promise<{ passed: boolean; details?: string }>;
}

export interface ConnectorCertificationResult {
  name: string;
  passed: boolean;
  schemaVersion: string;
  details?: string;
}
