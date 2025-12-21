import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import yaml from 'yaml';

export type ControlStatus = 'enforced' | 'in-progress' | 'gap' | 'deprecated';

export type ControlType = 'preventive' | 'detective' | 'corrective';

export interface ControlDefinition {
  id: string;
  policy: string;
  control_type: ControlType;
  enforcement: string[];
  evidence: string[];
  owner: string;
  review_cadence: string;
  status: ControlStatus;
  metadata?: Record<string, unknown>;
}

export interface ControlCoverageSummary {
  totalControls: number;
  enforcedControls: number;
  gaps: ControlDefinition[];
  policiesWithCoverage: Set<string>;
  missingPolicies: string[];
}

function normalizeControl(raw: ControlDefinition): ControlDefinition {
  if (!raw.id || !raw.policy) {
    throw new Error('Control definitions require id and policy');
  }

  const enforcement = raw.enforcement ?? [];
  const evidence = raw.evidence ?? [];

  if (raw.status !== 'gap' && enforcement.length === 0) {
    throw new Error(`Control ${raw.id} must declare enforcement unless marked as gap`);
  }

  if (raw.status !== 'gap' && evidence.length === 0) {
    throw new Error(`Control ${raw.id} must declare evidence unless marked as gap`);
  }

  return {
    ...raw,
    enforcement,
    evidence,
  };
}

export class ControlCatalog {
  private readonly controls = new Map<string, ControlDefinition>();

  constructor(definitions: ControlDefinition[] = []) {
    definitions.forEach((definition) => this.addControl(definition));
  }

  static fromFile(filePath: string): ControlCatalog {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = filePath.endsWith('.json') ? JSON.parse(raw) : yaml.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Control catalog file must contain an array of controls');
    }
    return new ControlCatalog(parsed as ControlDefinition[]);
  }

  addControl(definition: ControlDefinition): void {
    const normalized = normalizeControl(definition);
    if (this.controls.has(normalized.id)) {
      throw new Error(`Control with id ${normalized.id} already exists`);
    }
    this.controls.set(normalized.id, normalized);
  }

  updateControl(definition: ControlDefinition): void {
    const normalized = normalizeControl(definition);
    this.controls.set(normalized.id, normalized);
  }

  getControl(id: string): ControlDefinition | undefined {
    const existing = this.controls.get(id);
    return existing ? { ...existing } : undefined;
  }

  listControls(): ControlDefinition[] {
    return Array.from(this.controls.values()).map((control) => ({ ...control }));
  }

  controlsForPolicy(policy: string): ControlDefinition[] {
    return this.listControls().filter((control) => control.policy === policy);
  }

  coverage(policies: string[]): ControlCoverageSummary {
    const missingPolicies = policies.filter(
      (policy) => this.controlsForPolicy(policy).length === 0,
    );

    const gaps = this.listControls().filter((control) => control.status === 'gap');
    const enforcedControls = this.listControls().filter(
      (control) => control.status === 'enforced',
    ).length;

    return {
      totalControls: this.controls.size,
      enforcedControls,
      gaps,
      policiesWithCoverage: new Set(policies.filter((p) => !missingPolicies.includes(p))),
      missingPolicies,
    };
  }

  hash(): string {
    const sorted = this.listControls().sort((a, b) => a.id.localeCompare(b.id));
    const digest = createHash('sha256');
    digest.update(JSON.stringify(sorted));
    return digest.digest('hex');
  }

  exportToFile(targetPath: string): void {
    const serialized = targetPath.endsWith('.json')
      ? JSON.stringify(this.listControls(), null, 2)
      : yaml.stringify(this.listControls());
    writeFileSync(targetPath, serialized);
  }

  resolvePolicyGaps(policy: string, remediation: Partial<ControlDefinition>): ControlDefinition {
    const currentGaps = this.controlsForPolicy(policy).filter(
      (control) => control.status === 'gap',
    );
    if (currentGaps.length === 0) {
      throw new Error(`No gaps recorded for policy ${policy}`);
    }

    const patch = normalizeControl({
      ...currentGaps[0],
      ...remediation,
      status: remediation.status ?? 'enforced',
    });
    this.updateControl(patch);
    return patch;
  }

  policies(): string[] {
    return Array.from(new Set(this.listControls().map((control) => control.policy)));
  }
}

export function determineCatalogPath(baseDir: string): string {
  const yamlPath = path.join(baseDir, 'control-catalog.yaml');
  const jsonPath = path.join(baseDir, 'control-catalog.json');
  if (existsSync(yamlPath)) {
    return yamlPath;
  }
  if (existsSync(jsonPath)) {
    return jsonPath;
  }
  throw new Error(`No control catalog found in ${baseDir}`);
}
