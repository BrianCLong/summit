import { GraphMutation, SynintSweepResult } from "./types.js";

export interface SynintMapperConfig {
  sourceTag?: string; // e.g. "synint"
}

export class SynintMapper {
  private cfg: Required<SynintMapperConfig>;

  constructor(cfg: SynintMapperConfig = {}) {
    this.cfg = { sourceTag: cfg.sourceTag ?? "synint" };
  }

  toMutations(sweep: SynintSweepResult): GraphMutation[] {
    const muts: GraphMutation[] = [];

    // Always emit an audit-ish event
    muts.push({
      kind: "emitEvent",
      event: {
        type: "osint.sweep.completed",
        at: sweep.completedAt,
        target: sweep.target,
        payload: {
          source: this.cfg.sourceTag,
          startedAt: sweep.startedAt,
          completedAt: sweep.completedAt,
          agentCount: sweep.agents.length,
          successCount: sweep.agents.filter(a => a.success).length,
        },
      },
    });

    for (const agent of sweep.agents) {
      const name = agent.agentName?.toLowerCase?.() ?? "";
      if (name.includes("whois")) muts.push(...this.mapWhois(sweep.target, agent.findings));
      if (name.includes("social")) muts.push(...this.mapSocial(sweep.target, agent.findings));
      // add: cybint / siem / threat analyzer etc as you formalize schemas
    }

    return muts;
  }

  private mapWhois(target: string, findings: unknown): GraphMutation[] {
    // Expect: { domain, registrar, registrantOrg, nameServers, emails, phones, ips? } (example)
    const f = (findings ?? {}) as Record<string, unknown>;

    const domain = String(f.domain ?? target);
    const domainId = `domain:${domain}`;

    const muts: GraphMutation[] = [
      {
        kind: "upsertNode",
        node: {
          id: domainId,
          labels: ["Domain"],
          props: { domain, source: this.cfg.sourceTag, lastSeenAt: new Date().toISOString() },
        },
      },
    ];

    const registrantOrg = typeof f.registrantOrg === "string" ? f.registrantOrg : undefined;
    if (registrantOrg) {
      const orgId = `org:${registrantOrg}`;
      muts.push({
        kind: "upsertNode",
        node: { id: orgId, labels: ["Organization"], props: { name: registrantOrg, source: this.cfg.sourceTag } },
      });
      muts.push({
        kind: "upsertEdge",
        edge: { id: `edge:${domainId}->registered_to->${orgId}`, type: "REGISTERED_TO", from: domainId, to: orgId, props: { source: this.cfg.sourceTag } },
      });
    }

    return muts;
  }

  private mapSocial(target: string, findings: unknown): GraphMutation[] {
    // Expect: { accounts: [{ platform, handle, url, confidence, relatedTo }] }
    const f = (findings ?? {}) as Record<string, unknown>;
    const accounts = Array.isArray((f as any).accounts) ? (f as any).accounts : [];

    const muts: GraphMutation[] = [];
    const targetId = `target:${target}`;

    muts.push({
      kind: "upsertNode",
      node: { id: targetId, labels: ["Target"], props: { key: target, source: this.cfg.sourceTag } },
    });

    for (const a of accounts) {
      const platform = String(a.platform ?? "unknown");
      const handle = String(a.handle ?? "unknown");
      const accountId = `acct:${platform}:${handle}`;

      muts.push({
        kind: "upsertNode",
        node: {
          id: accountId,
          labels: ["Account"],
          props: {
            platform,
            handle,
            url: a.url ?? null,
            confidence: a.confidence ?? null,
            source: this.cfg.sourceTag,
          },
        },
      });

      muts.push({
        kind: "upsertEdge",
        edge: {
          id: `edge:${targetId}->associated_with->${accountId}`,
          type: "ASSOCIATED_WITH",
          from: targetId,
          to: accountId,
          props: { source: this.cfg.sourceTag },
        },
      });
    }

    return muts;
  }
}
