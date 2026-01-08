import fs from "fs/promises";
import path from "path";
import { parse } from "yaml";
import { z } from "zod";

export type ControlCategory = "security" | "availability" | "confidentiality" | "privacy";
export type ControlCheckType = "automated" | "manual-with-expiry" | "hybrid";

export interface ControlOwner {
  primary: string;
  backup?: string;
  team?: string;
}

export interface ControlSchedule {
  frequencyMinutes: number;
  toleranceMinutes: number;
}

export interface EvidenceConfig {
  path: string;
  retentionDays: number;
  ttlDays: number;
  signer: string;
  watermark?: boolean;
}

export interface ControlCheckDefinition {
  type: ControlCheckType;
  script?: string;
  query?: string;
  manualEvidence?: string;
  endpoint?: string;
}

export interface ControlDefinition {
  id: string;
  title: string;
  category: ControlCategory;
  objective: string;
  owner: ControlOwner;
  check: ControlCheckDefinition;
  schedule: ControlSchedule;
  rtoMinutes: number;
  evidence: EvidenceConfig;
  tags: string[];
  dependencies?: string[];
  narrative?: string;
}

const ControlOwnerSchema = z.object({
  primary: z.string().email(),
  backup: z.string().email().optional(),
  team: z.string().optional(),
});

const EvidenceConfigSchema = z.object({
  path: z.string(),
  retentionDays: z.number().positive(),
  ttlDays: z.number().positive(),
  signer: z.string(),
  watermark: z.boolean().optional(),
});

const ControlCheckSchema = z.object({
  type: z.enum(["automated", "manual-with-expiry", "hybrid"]),
  script: z.string().optional(),
  query: z.string().optional(),
  manualEvidence: z.string().optional(),
  endpoint: z.string().url().optional(),
});

const ControlScheduleSchema = z.object({
  frequencyMinutes: z.number().positive(),
  toleranceMinutes: z.number().nonnegative(),
});

const ControlDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  category: z.enum(["security", "availability", "confidentiality", "privacy"]),
  objective: z.string().min(5),
  owner: ControlOwnerSchema,
  check: ControlCheckSchema,
  schedule: ControlScheduleSchema,
  rtoMinutes: z.number().positive(),
  evidence: EvidenceConfigSchema,
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).optional(),
  narrative: z.string().optional(),
});

export const ControlRegistrySchema = z.array(ControlDefinitionSchema);

export class ControlRegistry {
  private readonly controls: Map<string, ControlDefinition>;
  private readonly loadedFrom?: string;

  private constructor(controls: ControlDefinition[], loadedFrom?: string) {
    this.controls = new Map(controls.map((control) => [control.id, control]));
    this.loadedFrom = loadedFrom;
  }

  static async fromYaml(filePath: string): Promise<ControlRegistry> {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = parse(raw);
    const controls = ControlRegistrySchema.parse(parsed);
    const normalized = controls.map((control) => ({
      ...control,
      evidence: {
        ...control.evidence,
        path: path.resolve(path.dirname(filePath), control.evidence.path),
      },
    }));
    return new ControlRegistry(normalized, filePath);
  }

  static fromDefinitions(definitions: ControlDefinition[]): ControlRegistry {
    const controls = ControlRegistrySchema.parse(definitions);
    return new ControlRegistry(controls);
  }

  toJSON(): ControlDefinition[] {
    return Array.from(this.controls.values());
  }

  upsert(control: ControlDefinition): void {
    ControlDefinitionSchema.parse(control);
    this.controls.set(control.id, control);
  }

  get(controlId: string): ControlDefinition | undefined {
    return this.controls.get(controlId);
  }

  list(): ControlDefinition[] {
    return Array.from(this.controls.values());
  }

  get sourcePath(): string | undefined {
    return this.loadedFrom;
  }
}
