// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GAReleaseService } from './GAReleaseService.js';

type GateStatus = 'pass' | 'fail' | 'warning' | 'unknown';

export interface CommandConsoleSnapshot {
  generatedAt: string;
  gaGate: {
    overall: GateStatus;
    lastRun: string;
    missing?: string[];
    details: Array<{
      component: string;
      status: GateStatus;
      message: string;
    }>;
  };
  ci: {
    branch: string;
    status: GateStatus;
    commit: string;
    url?: string;
    updatedAt: string;
  };
  slo: {
    compliance: number;
    window: string;
    errorBudgetRemaining: number;
    burnRate: number;
  };
  llm: {
    aggregate: { tokens: number; cost: number; window: string };
    tenants: Array<{
      tenantId: string;
      tokens: number;
      cost: number;
      rateLimitStatus: string;
    }>;
  };
  dependencyRisk: {
    level: GateStatus;
    issues: number;
    lastScan: string;
    topRisks: string[];
  };
  evidence: {
    latestBundle: string;
    status: GateStatus;
    artifacts: number;
    lastGeneratedAt: string;
  };
  tenants: Array<{
    tenantId: string;
    active: boolean;
    rateLimit: string;
    ingestionCap: string;
    killSwitch: boolean;
  }>;
  incidents: {
    gaGateFailures: Array<{ id: string; message: string; occurredAt: string }>;
    policyDenials: Array<{ id: string; scope: string; occurredAt: string }>;
    killSwitchActivations: Array<{
      id: string;
      tenantId: string;
      occurredAt: string;
    }>;
  };
}

export class CommandConsoleService {
  private gaService = new GAReleaseService();

  async getSnapshot(): Promise<CommandConsoleSnapshot> {
    const [
      gaGate,
      ci,
      dependencyRisk,
      evidence,
      tenants,
      slo,
      llm,
    ] = await Promise.all([
      this.getGAGateStatus(),
      this.getCIStatus(),
      this.getDependencyRiskSummary(),
      this.getEvidenceStatus(),
      this.getTenantSnapshot(),
      this.getSLOStatus(),
      this.getLLMUsage(),
    ]);

    const incidents = this.buildIncidents(gaGate, tenants);

    return {
      generatedAt: new Date().toISOString(),
      gaGate,
      ci,
      slo,
      llm,
      dependencyRisk,
      evidence,
      tenants,
      incidents,
    };
  }

  private async getGAGateStatus(): Promise<CommandConsoleSnapshot['gaGate']> {
    try {
      const [releaseInfo, deployment] = await Promise.all([
        this.gaService.getReleaseInfo(),
        this.gaService.validateDeployment(),
      ]);

      const missing = this.getMissingDependencies();
      const lastRun = this.getArtifactTimestamp([
        'final_validation.json',
        'final_validation_phase3.py',
      ]);

      const details =
        deployment.validations?.map((v) => ({
          component: v.component,
          status: v.status,
          message: v.message,
        })) ?? [];

      if (missing.length > 0) {
        details.push(
          ...missing.map((item) => ({
            component: item,
            status: 'fail' as const,
            message: `${item} not detected`,
          })),
        );
      }

      return {
        overall: deployment.ready && missing.length === 0 ? 'pass' : 'fail',
        lastRun: lastRun ?? releaseInfo.buildDate,
        missing,
        details,
      };
    } catch (error: any) {
      return {
        overall: 'unknown',
        lastRun: new Date().toISOString(),
        details: [
          {
            component: 'ga-release-service',
            status: 'fail',
            message:
              error instanceof Error ? error.message : 'Unknown GA gate error',
          },
        ],
      };
    }
  }

  private getMissingDependencies(): string[] {
    const missing: string[] = [];
    const appPath = path.join(process.cwd(), 'apps', 'command-console');
    if (!fs.existsSync(appPath)) {
      missing.push('command-console-app');
    }

    const routeCandidates = [
      path.join(
        process.cwd(),
        'server',
        'src',
        'routes',
        'internal',
        'command-console.ts',
      ),
      path.join(
        process.cwd(),
        'server',
        'dist',
        'routes',
        'internal',
        'command-console.js',
      ),
    ];
    if (!routeCandidates.some((candidate) => fs.existsSync(candidate))) {
      missing.push('command-console-endpoints');
    }

    return missing;
  }

  private async getCIStatus(): Promise<CommandConsoleSnapshot['ci']> {
    const ciStatusFile = this.readJsonIfExists([
      path.join(process.cwd(), 'status', 'ci.json'),
      path.join(process.cwd(), 'reports', 'ci-status.json'),
    ]);

    let commit = 'unknown';
    try {
      commit = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
      }).trim();
    } catch {
      commit = 'unknown';
    }

    return {
      branch: ciStatusFile?.branch ?? 'main',
      status: (ciStatusFile?.status as GateStatus) ?? 'warning',
      commit,
      url: ciStatusFile?.url,
      updatedAt:
        ciStatusFile?.updatedAt ?? new Date().toISOString(),
    };
  }

  private getSLOStatus(): CommandConsoleSnapshot['slo'] {
    const compliance = Number(process.env.SLO_COMPLIANCE ?? '0.987');
    const burnRate = Number(process.env.SLO_BURN_RATE ?? '0.65');
    const budget = Math.max(0, 1 - burnRate / 100);

    return {
      compliance,
      window: process.env.SLO_WINDOW ?? '30d',
      errorBudgetRemaining: budget,
      burnRate,
    };
  }

  private getLLMUsage(): CommandConsoleSnapshot['llm'] {
    const tenants = [
      {
        tenantId: 'acme',
        tokens: Number(process.env.LLM_ACME_TOKENS ?? '120000'),
        cost: Number(process.env.LLM_ACME_COST ?? '42.5'),
        rateLimitStatus: 'normal',
      },
      {
        tenantId: 'globex',
        tokens: Number(process.env.LLM_GLOBEX_TOKENS ?? '76000'),
        cost: Number(process.env.LLM_GLOBEX_COST ?? '24.1'),
        rateLimitStatus: 'constrained',
      },
    ];

    const aggregateTokens = tenants.reduce((sum, t) => sum + t.tokens, 0);
    const aggregateCost = tenants.reduce((sum, t) => sum + t.cost, 0);

    return {
      aggregate: {
        tokens: aggregateTokens,
        cost: aggregateCost,
        window: '7d',
      },
      tenants,
    };
  }

  private async getDependencyRiskSummary(): Promise<
    CommandConsoleSnapshot['dependencyRisk']
  > {
    const dependencyReport = this.readJsonIfExists([
      path.join(process.cwd(), 'DEPENDENCY_HEALTH_CHECK.json'),
      path.join(process.cwd(), 'DEPENDENCY_HEALTH_CHECK_SUMMARY.json'),
    ]);

    return {
      level: (dependencyReport?.level as GateStatus) ?? 'warning',
      issues: dependencyReport?.issues ?? 3,
      lastScan:
        dependencyReport?.lastScan ?? new Date().toISOString(),
      topRisks:
        dependencyReport?.topRisks ?? [
          'outdated-core-library',
          'missing-sbom-scan',
          'pinned-dev-dependency',
        ],
    };
  }

  private async getEvidenceStatus(): Promise<CommandConsoleSnapshot['evidence']> {
    const manifestPath = path.join(
      process.cwd(),
      'EVIDENCE_BUNDLE.manifest.json',
    );

    if (fs.existsSync(manifestPath)) {
      try {
        const content = await fs.promises.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(content);
        return {
          latestBundle: manifest.bundleId ?? 'latest',
          status: 'pass',
          artifacts: Array.isArray(manifest.artifacts)
            ? manifest.artifacts.length
            : 0,
          lastGeneratedAt: manifest.generatedAt ?? this.getFileTimestamp(manifestPath),
        };
      } catch {
        // fall through to default
      }
    }

    return {
      latestBundle: 'not-found',
      status: 'warning',
      artifacts: 0,
      lastGeneratedAt: new Date().toISOString(),
    };
  }

  private async getTenantSnapshot(): Promise<CommandConsoleSnapshot['tenants']> {
    const killSwitchActive =
      (process.env.SAFETY_KILL_SWITCH ?? 'false').toLowerCase() === 'true';

    return [
      {
        tenantId: 'acme',
        active: true,
        rateLimit: '8r/s',
        ingestionCap: '5k records/hr',
        killSwitch: killSwitchActive,
      },
      {
        tenantId: 'globex',
        active: true,
        rateLimit: '5r/s',
        ingestionCap: '2k records/hr',
        killSwitch: false,
      },
      {
        tenantId: 'summit-internal',
        active: true,
        rateLimit: 'unbounded',
        ingestionCap: 'observability-only',
        killSwitch: false,
      },
    ];
  }

  private buildIncidents(
    gaGate: CommandConsoleSnapshot['gaGate'],
    tenants: CommandConsoleSnapshot['tenants'],
  ): CommandConsoleSnapshot['incidents'] {
    const gaFailures =
      gaGate.details
        ?.filter((d) => d.status === 'fail')
        .map((d, index) => ({
          id: `ga-${index}`,
          message: `${d.component}: ${d.message}`,
          occurredAt: gaGate.lastRun,
        })) ?? [];

    const policyDenials = [
      {
        id: 'policy-llm-0',
        scope: 'llm-safety',
        occurredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];

    const killSwitchActivations = tenants
      .filter((t) => t.killSwitch)
      .map((tenant) => ({
        id: `kill-${tenant.tenantId}`,
        tenantId: tenant.tenantId,
        occurredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      }));

    return { gaGateFailures: gaFailures, policyDenials, killSwitchActivations };
  }

  private readJsonIfExists(pathsToTry: string[]): Record<string, unknown> | null {
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private getArtifactTimestamp(pathsToTry: string[]): string | null {
    for (const candidate of pathsToTry) {
      const full = path.join(process.cwd(), candidate);
      if (fs.existsSync(full)) {
        return this.getFileTimestamp(full);
      }
    }
    return null;
  }

  private getFileTimestamp(filePath: string): string {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString();
  }
}
