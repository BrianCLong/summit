import {
  type ComplianceFramework,
  type ControlEvidenceBundle,
  type ControlEvidenceMapping,
  type ControlRequirement,
  type EvidenceArtifact,
} from "common-types";
import { AccessTokenService } from "./quantum-safe-ledger.js";

type ControlRecord = {
  canonicalId: string;
  title: string;
  description?: string;
  frameworks: Map<ComplianceFramework, ControlRequirement>;
  evidence: Map<string, EvidenceArtifact>;
};

function toFrameworkList(
  frameworks: ComplianceFramework | ComplianceFramework[]
): ComplianceFramework[] {
  const list = Array.isArray(frameworks) ? frameworks : [frameworks];
  return Array.from(new Set(list)).sort();
}

export class ControlCrosswalk {
  private readonly controls = new Map<string, ControlRecord>();
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  registerCanonical(control: { id: string; title: string; description?: string }): void {
    const existing = this.controls.get(control.id);
    if (existing) {
      existing.title = control.title;
      existing.description = control.description ?? existing.description;
      return;
    }
    this.controls.set(control.id, {
      canonicalId: control.id,
      title: control.title,
      description: control.description,
      frameworks: new Map(),
      evidence: new Map(),
    });
  }

  linkFrameworkControl(canonicalId: string, control: ControlRequirement): ControlRequirement {
    const record = this.controls.get(canonicalId);
    if (!record) {
      throw new Error(`Unknown canonical control ${canonicalId}`);
    }
    record.frameworks.set(control.framework, control);
    return control;
  }

  attachEvidence(canonicalId: string, artifact: EvidenceArtifact): EvidenceArtifact {
    const record = this.controls.get(canonicalId);
    if (!record) {
      throw new Error(`Unknown canonical control ${canonicalId}`);
    }
    const existing = record.evidence.get(artifact.id);
    const merged: EvidenceArtifact = {
      ...artifact,
      controlIds: artifact.controlIds ?? [canonicalId],
    };
    record.evidence.set(artifact.id, merged);
    return existing ?? merged;
  }

  bundleForFrameworks(
    frameworks: ComplianceFramework | ComplianceFramework[]
  ): ControlEvidenceBundle {
    const targetFrameworks = toFrameworkList(frameworks);
    let mappedFrameworks = 0;
    let evidenceCount = 0;

    const controls: ControlEvidenceMapping[] = [];
    this.controls.forEach((record) => {
      const matches = targetFrameworks
        .map((framework) => record.frameworks.get(framework))
        .filter((item): item is ControlRequirement => Boolean(item));
      if (!matches.length) {
        return;
      }
      mappedFrameworks += matches.length;
      const evidence = Array.from(record.evidence.values());
      evidenceCount += evidence.length;
      controls.push({
        canonicalId: record.canonicalId,
        canonicalTitle: record.title,
        frameworks: matches,
        evidence,
      });
    });

    controls.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));

    return {
      generatedAt: this.now().toISOString(),
      frameworks: targetFrameworks,
      controls,
      coverage: {
        canonical: controls.length,
        frameworkMappings: mappedFrameworks,
        evidence: evidenceCount,
      },
      readOnly: false,
    };
  }

  coverageFor(framework: ComplianceFramework): { mapped: number; total: number; percent: number } {
    const total = this.controls.size;
    let mapped = 0;
    this.controls.forEach((record) => {
      if (record.frameworks.has(framework)) {
        mapped += 1;
      }
    });
    const percent = total === 0 ? 0 : Number(((mapped / total) * 100).toFixed(2));
    return { mapped, total, percent };
  }
}

export interface AuditorPortalOptions {
  tokenSecret?: string;
  tokenTtlMs?: number;
  now?: () => Date;
  crosswalk?: ControlCrosswalk;
}

export class AuditorPortal {
  private readonly tokenService: AccessTokenService;
  private readonly crosswalk: ControlCrosswalk;
  private readonly now: () => Date;

  constructor(options: AuditorPortalOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.crosswalk = options.crosswalk ?? new ControlCrosswalk(this.now);
    this.tokenService = new AccessTokenService(options.tokenSecret ?? "audit-portal-secret", {
      ttlMs: options.tokenTtlMs ?? 10 * 60 * 1000,
      now: this.now,
    });
  }

  issueReadOnlyToken(auditorId: string, frameworks: ComplianceFramework[]): string {
    const scope = this.encodeFrameworkScope(frameworks);
    return this.tokenService.issue(auditorId, scope).token;
  }

  fetchEvidenceBundle(
    token: string,
    frameworks?: ComplianceFramework | ComplianceFramework[]
  ): ControlEvidenceBundle {
    const payload = this.tokenService.verify(token);
    if (!payload) {
      throw new Error("Invalid or expired auditor token");
    }
    const allowedFrameworks = this.decodeFrameworkScope(payload.scope);
    const requested = frameworks ? toFrameworkList(frameworks) : [...allowedFrameworks];
    const unauthorized = requested.filter((framework) => !allowedFrameworks.includes(framework));
    if (unauthorized.length) {
      throw new Error(`Token does not permit frameworks: ${unauthorized.join(", ")}`);
    }
    const bundle = this.crosswalk.bundleForFrameworks(requested);
    return { ...bundle, readOnly: true };
  }

  private encodeFrameworkScope(frameworks: ComplianceFramework[]): string {
    const list = toFrameworkList(frameworks);
    return `auditor:read:${list.join("|")}`;
  }

  private decodeFrameworkScope(scope: string): ComplianceFramework[] {
    const [role, mode, list] = scope.split(":");
    if (role !== "auditor" || mode !== "read") {
      throw new Error("Token is not read-only auditor scope");
    }
    if (!list) {
      return [];
    }
    return list.split("|").filter(Boolean) as ComplianceFramework[];
  }
}
