import type { GraphMutation, SynintSweepResult } from './types.js';

export interface SynintMapperConfig {
  sourceTag?: string;
}

export class SynintMapper {
  private cfg: Required<SynintMapperConfig>;

  constructor(cfg: SynintMapperConfig = {}) {
    this.cfg = { sourceTag: cfg.sourceTag ?? 'synint' };
  }

  private normalizeIdSegment(value: string): string {
    return encodeURIComponent(value.trim().toLowerCase());
  }

  toMutations(sweep: SynintSweepResult): GraphMutation[] {
    const mutations: GraphMutation[] = [];

    mutations.push({
      kind: 'emitEvent',
      event: {
        type: 'osint.sweep.completed',
        at: sweep.completedAt,
        target: sweep.target,
        payload: {
          posture: 'sensing',
          inference: 'intentionally_constrained',
          source: this.cfg.sourceTag,
          startedAt: sweep.startedAt,
          completedAt: sweep.completedAt,
          agentCount: sweep.agents.length,
          successCount: sweep.agents.filter((agent) => agent.success).length,
        },
      },
    });

    for (const agent of sweep.agents) {
      const name = agent.agentName?.toLowerCase?.() ?? '';
      if (name.includes('whois')) {
        mutations.push(...this.mapWhois(sweep.target, agent.findings));
      }
      if (name.includes('social')) {
        mutations.push(...this.mapSocial(sweep.target, agent.findings));
      }
    }

    return mutations;
  }

  private mapWhois(target: string, findings: unknown): GraphMutation[] {
    const data = (findings ?? {}) as Record<string, unknown>;
    const domain = String(data.domain ?? target).toLowerCase();
    const domainId = `domain:${this.normalizeIdSegment(domain)}`;

    const mutations: GraphMutation[] = [
      {
        kind: 'upsertNode',
        node: {
          id: domainId,
          labels: ['Domain'],
          props: {
            domain,
            source: this.cfg.sourceTag,
            lastSeenAt: new Date().toISOString(),
          },
        },
      },
    ];

    const registrantOrg =
      typeof data.registrantOrg === 'string' ? data.registrantOrg : undefined;

    if (registrantOrg) {
      const orgId = `org:${this.normalizeIdSegment(registrantOrg)}`;
      mutations.push({
        kind: 'upsertNode',
        node: {
          id: orgId,
          labels: ['Organization'],
          props: {
            name: registrantOrg,
            source: this.cfg.sourceTag,
          },
        },
      });

      mutations.push({
        kind: 'upsertEdge',
        edge: {
          id: `edge:${domainId}->registered_to->${orgId}`,
          type: 'REGISTERED_TO',
          from: domainId,
          to: orgId,
          props: { source: this.cfg.sourceTag },
        },
      });
    }

    return mutations;
  }

  private mapSocial(target: string, findings: unknown): GraphMutation[] {
    const data = (findings ?? {}) as Record<string, unknown>;
    const accounts = Array.isArray((data as { accounts?: unknown }).accounts)
      ? (data as { accounts: Array<Record<string, unknown>> }).accounts
      : [];

    const mutations: GraphMutation[] = [];
    const targetId = `target:${this.normalizeIdSegment(target)}`;

    mutations.push({
      kind: 'upsertNode',
      node: {
        id: targetId,
        labels: ['Target'],
        props: { key: target, source: this.cfg.sourceTag },
      },
    });

    for (const account of accounts) {
      const platform = String(account.platform ?? 'unknown');
      const handle = String(account.handle ?? 'unknown');
      const accountId = `acct:${this.normalizeIdSegment(platform)}:${this.normalizeIdSegment(handle)}`;

      mutations.push({
        kind: 'upsertNode',
        node: {
          id: accountId,
          labels: ['Account'],
          props: {
            platform,
            handle,
            url: account.url ?? null,
            confidence: account.confidence ?? null,
            source: this.cfg.sourceTag,
          },
        },
      });

      mutations.push({
        kind: 'upsertEdge',
        edge: {
          id: `edge:${targetId}->associated_with->${accountId}`,
          type: 'ASSOCIATED_WITH',
          from: targetId,
          to: accountId,
          props: { source: this.cfg.sourceTag },
        },
      });
    }

    return mutations;
  }
}
