import { randomUUID } from 'crypto';
import { z } from 'zod';

const canonicalKpis = [
  {
    slug: 'new-arr',
    name: 'New ARR',
    owner: 'VP Sales Ops',
    dataSource: 'CRM bookings table',
    definition: 'Net new annual recurring revenue booked in-period (excludes renewals and expansions).',
    freshnessSlaHours: 24,
  },
  {
    slug: 'ndr',
    name: 'Net Dollar Retention (NDR)',
    owner: 'VP Sales Ops',
    dataSource: 'CRM, billing, product usage',
    definition: 'Cohort-based 12-month trailing (Starting ARR + expansions − churn − downgrades) / Starting ARR.',
    freshnessSlaHours: 24,
  },
  {
    slug: 'grr',
    name: 'Gross Revenue Retention (GRR)',
    owner: 'VP Sales Ops',
    dataSource: 'CRM, billing',
    definition: '12-month trailing (Starting ARR − churn − downgrades) / Starting ARR.',
    freshnessSlaHours: 24,
  },
  {
    slug: 'waa',
    name: 'Weekly Active Accounts (WAA)',
    owner: 'VP Product',
    dataSource: 'Product events warehouse',
    definition:
      'Count of distinct paying customer accounts with ≥1 key action/week, segmented by ICP/SMB/region.',
    freshnessSlaHours: 24,
  },
  {
    slug: 'onboarding-ttfv',
    name: 'Onboarding Time to First Value',
    owner: 'VP CS',
    dataSource: 'CS system, product telemetry',
    definition: 'Median days from contract start to first success milestone; track p90 and segments.',
    freshnessSlaHours: 24,
  },
  {
    slug: 'uptime-slo',
    name: 'Uptime (SLO)',
    owner: 'SRE Lead',
    dataSource: 'Observability/SLI exporter',
    definition: '100% − error budget burn for Tier0/1 services (per SLO) with per-service/team publication.',
    freshnessSlaHours: 1,
  },
  {
    slug: 'change-failure-rate',
    name: 'Change Failure Rate',
    owner: 'Eng Director',
    dataSource: 'CI/CD events + incident links',
    definition: 'Failed changes / total changes for Tier0/1 weekly; failure = rollback, hotfix, or Sev1/2 triggered.',
    freshnessSlaHours: 24,
  },
  {
    slug: 'mttr',
    name: 'MTTR',
    owner: 'SRE Lead',
    dataSource: 'Incident system',
    definition: 'Median time from incident start to full resolution for Sev1/2 (planned maintenance tracked separately).',
    freshnessSlaHours: 24,
  },
  {
    slug: 'security-sla-hit-rate',
    name: 'Security Findings SLA Hit Rate',
    owner: 'Security Lead',
    dataSource: 'Vuln scanner + ticketing',
    definition: '%% findings closed within SLA by severity (Sev1:7d, Sev2:30d, Sev3:90d).',
    freshnessSlaHours: 24,
  },
  {
    slug: 'cloud-unit-cost',
    name: 'Cloud Unit Cost',
    owner: 'FinOps Lead',
    dataSource: 'Billing + usage',
    definition: 'Infra cost per active account (or per 1k WAUs) normalized by region/tenant.',
    freshnessSlaHours: 24,
  },
  {
    slug: 'telemetry-efficiency',
    name: 'Telemetry Efficiency',
    owner: 'FinOps Lead',
    dataSource: 'Billing + ingestion counts',
    definition: 'Logging/metrics/traces spend per 1k requests with sampling and retention tiers enforced.',
    freshnessSlaHours: 24,
  },
  {
    slug: 'velocity-lead-time',
    name: 'Velocity (DORA: Lead Time)',
    owner: 'Eng Productivity',
    dataSource: 'VCS + CI/CD',
    definition: 'Median time from first commit to production deployment by team/service excluding paused work.',
    freshnessSlaHours: 24,
  },
] as const;

const riskCategories = [
  'legal',
  'security',
  'reliability',
  'financial',
  'vendor',
  'people',
  'compliance',
] as const;

export type PgAdapter = {
  write: (query: string, params?: any[], options?: Record<string, unknown>) => Promise<any>;
  read: (query: string, params?: any[], options?: Record<string, unknown>) => Promise<any>;
  oneOrNone: (query: string, params?: any[], options?: Record<string, unknown>) => Promise<any>;
  readMany: (query: string, params?: any[], options?: Record<string, unknown>) => Promise<any>;
};

export interface ScoreboardFilter {
  segment?: Record<string, string>;
}

export interface KpiValueInput {
  kpiSlug: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  target?: number;
  segment?: Record<string, string>;
  commentary?: string;
}

export interface ReleaseMarkerInput {
  kpiSlug?: string;
  service: string;
  team?: string;
  version: string;
  deployedAt: string;
  owner: string;
}

export interface IncidentMarkerInput {
  kpiSlug?: string;
  service?: string;
  severity: string;
  summary: string;
  startedAt: string;
  resolvedAt?: string;
  owner: string;
}

export interface RiskInput {
  id?: string;
  category: (typeof riskCategories)[number];
  probability: number;
  impactDollars: number;
  customerImpact: string;
  owner: string;
  mitigations: string;
  mitigationSla: string;
  evidenceLinks?: string[];
  leadingIndicators?: string[];
  nextReview: string;
  acceptanceExpiry?: string;
}

export class ExecutiveOpsRepository {
  constructor(private readonly db: PgAdapter, private readonly tenantId?: string) {}

  async initialize() {
    await this.db.write(
      `CREATE TABLE IF NOT EXISTS executive_kpis (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        owner TEXT NOT NULL,
        data_source TEXT NOT NULL,
        definition TEXT NOT NULL,
        freshness_sla_hours INT NOT NULL,
        last_refresh_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`,
      [],
      this.scope(),
    );

    await this.db.write(
      `CREATE TABLE IF NOT EXISTS executive_kpi_values (
        id TEXT PRIMARY KEY,
        kpi_id TEXT REFERENCES executive_kpis(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        value NUMERIC NOT NULL,
        target NUMERIC,
        commentary TEXT,
        segment JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      [],
      this.scope(),
    );

    await this.db.write(
      `CREATE TABLE IF NOT EXISTS executive_release_markers (
        id TEXT PRIMARY KEY,
        kpi_id TEXT REFERENCES executive_kpis(id) ON DELETE SET NULL,
        service TEXT NOT NULL,
        team TEXT,
        version TEXT NOT NULL,
        deployed_at TIMESTAMPTZ NOT NULL,
        owner TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      [],
      this.scope(),
    );

    await this.db.write(
      `CREATE TABLE IF NOT EXISTS executive_incident_markers (
        id TEXT PRIMARY KEY,
        kpi_id TEXT REFERENCES executive_kpis(id) ON DELETE SET NULL,
        service TEXT,
        severity TEXT NOT NULL,
        summary TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        resolved_at TIMESTAMPTZ,
        owner TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      [],
      this.scope(),
    );

    await this.db.write(
      `CREATE TABLE IF NOT EXISTS risk_register (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        probability NUMERIC NOT NULL,
        impact_dollars NUMERIC NOT NULL,
        customer_impact TEXT NOT NULL,
        owner TEXT NOT NULL,
        mitigations TEXT NOT NULL,
        mitigation_sla DATE NOT NULL,
        evidence_links JSONB DEFAULT '[]'::jsonb,
        leading_indicators JSONB DEFAULT '[]'::jsonb,
        next_review DATE NOT NULL,
        acceptance_expiry DATE,
        status TEXT DEFAULT 'open',
        escalated BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`,
      [],
      this.scope(),
    );

    await this.seedCanonicalKpis();
  }

  private scope() {
    return this.tenantId ? { tenantId: this.tenantId } : undefined;
  }

  private async seedCanonicalKpis() {
    for (const kpi of canonicalKpis) {
      const id = `kpi_${kpi.slug}`;
      await this.db.write(
        `INSERT INTO executive_kpis (id, slug, name, owner, data_source, definition, freshness_sla_hours)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (slug) DO UPDATE SET owner = EXCLUDED.owner, data_source = EXCLUDED.data_source,
         definition = EXCLUDED.definition, freshness_sla_hours = EXCLUDED.freshness_sla_hours, updated_at = now()`,
        [
          id,
          kpi.slug,
          kpi.name,
          kpi.owner,
          kpi.dataSource,
          kpi.definition,
          kpi.freshnessSlaHours,
        ],
        this.scope(),
      );
    }
  }

  async recordKpiValue(input: KpiValueInput) {
    const parsed = z
      .object({
        kpiSlug: z.string(),
        periodStart: z.string(),
        periodEnd: z.string(),
        value: z.number(),
        target: z.number().optional(),
        segment: z.record(z.string()).optional(),
        commentary: z.string().optional(),
      })
      .parse(input);

    const kpi = await this.db.oneOrNone(
      `SELECT * FROM executive_kpis WHERE slug = $1`,
      [parsed.kpiSlug],
      this.scope(),
    );
    if (!kpi) {
      throw new Error(`Unknown KPI slug ${parsed.kpiSlug}`);
    }

    if (parsed.target !== undefined && (!parsed.commentary || parsed.commentary.trim() === '')) {
      throw new Error('Variance commentary is required when providing a target');
    }

    const id = randomUUID();
    await this.db.write(
      `INSERT INTO executive_kpi_values (id, kpi_id, period_start, period_end, value, target, commentary, segment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        kpi.id,
        parsed.periodStart,
        parsed.periodEnd,
        parsed.value,
        parsed.target ?? null,
        parsed.commentary ?? null,
        JSON.stringify(parsed.segment || {}),
      ],
      this.scope(),
    );

    await this.db.write(
      `UPDATE executive_kpis SET last_refresh_at = now(), updated_at = now() WHERE id = $1`,
      [kpi.id],
      this.scope(),
    );
    return id;
  }

  async addReleaseMarker(input: ReleaseMarkerInput) {
    const parsed = z
      .object({
        kpiSlug: z.string().optional(),
        service: z.string(),
        team: z.string().optional(),
        version: z.string(),
        deployedAt: z.string(),
        owner: z.string(),
      })
      .parse(input);

    const kpi = parsed.kpiSlug
      ? await this.db.oneOrNone(
          `SELECT id FROM executive_kpis WHERE slug = $1`,
          [parsed.kpiSlug],
          this.scope(),
        )
      : null;

    const id = randomUUID();
    await this.db.write(
      `INSERT INTO executive_release_markers (id, kpi_id, service, team, version, deployed_at, owner)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, kpi?.id ?? null, parsed.service, parsed.team ?? null, parsed.version, parsed.deployedAt, parsed.owner],
      this.scope(),
    );
    return id;
  }

  async addIncidentMarker(input: IncidentMarkerInput) {
    const parsed = z
      .object({
        kpiSlug: z.string().optional(),
        service: z.string().optional(),
        severity: z.string(),
        summary: z.string(),
        startedAt: z.string(),
        resolvedAt: z.string().optional(),
        owner: z.string(),
      })
      .parse(input);

    const kpi = parsed.kpiSlug
      ? await this.db.oneOrNone(
          `SELECT id FROM executive_kpis WHERE slug = $1`,
          [parsed.kpiSlug],
          this.scope(),
        )
      : null;

    const id = randomUUID();
    await this.db.write(
      `INSERT INTO executive_incident_markers (id, kpi_id, service, severity, summary, started_at, resolved_at, owner)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        kpi?.id ?? null,
        parsed.service ?? null,
        parsed.severity,
        parsed.summary,
        parsed.startedAt,
        parsed.resolvedAt ?? null,
        parsed.owner,
      ],
      this.scope(),
    );
    return id;
  }

  async upsertRisk(input: RiskInput) {
    const parsed = z
      .object({
        id: z.string().optional(),
        category: z.enum(riskCategories),
        probability: z.number().min(0).max(1),
        impactDollars: z.number().min(0),
        customerImpact: z.string(),
        owner: z.string(),
        mitigations: z.string(),
        mitigationSla: z.string(),
        evidenceLinks: z.array(z.string()).optional(),
        leadingIndicators: z.array(z.string()).optional(),
        nextReview: z.string(),
        acceptanceExpiry: z.string().optional(),
      })
      .parse(input);

    const id = parsed.id ?? `risk_${randomUUID()}`;
    await this.db.write(
      `INSERT INTO risk_register (id, category, probability, impact_dollars, customer_impact, owner, mitigations,
        mitigation_sla, evidence_links, leading_indicators, next_review, acceptance_expiry, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, probability = EXCLUDED.probability,
        impact_dollars = EXCLUDED.impact_dollars, customer_impact = EXCLUDED.customer_impact, owner = EXCLUDED.owner,
        mitigations = EXCLUDED.mitigations, mitigation_sla = EXCLUDED.mitigation_sla,
        evidence_links = EXCLUDED.evidence_links, leading_indicators = EXCLUDED.leading_indicators,
        next_review = EXCLUDED.next_review, acceptance_expiry = EXCLUDED.acceptance_expiry, status = EXCLUDED.status,
        updated_at = now()`,
      [
        id,
        parsed.category,
        parsed.probability,
        parsed.impactDollars,
        parsed.customerImpact,
        parsed.owner,
        parsed.mitigations,
        parsed.mitigationSla,
        JSON.stringify(parsed.evidenceLinks ?? []),
        JSON.stringify(parsed.leadingIndicators ?? []),
        parsed.nextReview,
        parsed.acceptanceExpiry ?? null,
        parsed.acceptanceExpiry ? 'accepted' : 'open',
      ],
      this.scope(),
    );
    await this.applyRiskEscalation(id);
    return id;
  }

  async updateRiskAcceptance(id: string, expiry: string) {
    await this.db.write(
      `UPDATE risk_register SET acceptance_expiry = $2, status = 'accepted', updated_at = now() WHERE id = $1`,
      [id, expiry],
      this.scope(),
    );
  }

  private async applyRiskEscalation(id: string) {
    const risk = await this.db.oneOrNone(
      `SELECT * FROM risk_register WHERE id = $1`,
      [id],
      this.scope(),
    );
    if (!risk) return;

    const mitigationPastDue = new Date(risk.mitigation_sla) < new Date();
    const acceptanceExpired = risk.acceptance_expiry
      ? new Date(risk.acceptance_expiry) < new Date()
      : false;

    if (mitigationPastDue || acceptanceExpired) {
      await this.db.write(
        `UPDATE risk_register SET escalated = true, status = CASE WHEN status = 'accepted' THEN 'expired' ELSE status END, updated_at = now()
         WHERE id = $1`,
        [id],
        this.scope(),
      );
    }
  }

  async listTopRisks(limit = 10) {
    const risks = await this.db.readMany(
      `SELECT *, (probability * impact_dollars) AS risk_score
       FROM risk_register
       ORDER BY risk_score DESC
       LIMIT $1`,
      [limit],
      this.scope(),
    );
    return risks;
  }

  async getScoreboard(filter: ScoreboardFilter = {}) {
    const kpis = await this.db.readMany(
      `SELECT * FROM executive_kpis ORDER BY name`,
      [],
      this.scope(),
    );

    const values = await this.db.readMany(
      `SELECT * FROM executive_kpi_values`,
      [],
      this.scope(),
    );

    const releaseMarkers = await this.db.readMany(
      `SELECT * FROM executive_release_markers`,
      [],
      this.scope(),
    );

    const incidentMarkers = await this.db.readMany(
      `SELECT * FROM executive_incident_markers`,
      [],
      this.scope(),
    );

    return kpis.map((kpi: any) => {
      const associatedValues = values
        .filter((v: any) => v.kpi_id === kpi.id)
        .filter((v: any) => this.segmentMatches(v.segment, filter.segment));
      const latestValue = associatedValues.sort(
        (a: any, b: any) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime(),
      )[0];

      const releases = releaseMarkers.filter((m: any) => m.kpi_id === kpi.id);
      const incidents = incidentMarkers.filter((m: any) => m.kpi_id === kpi.id);

      return {
        slug: kpi.slug,
        name: kpi.name,
        owner: kpi.owner,
        dataSource: kpi.data_source,
        definition: kpi.definition,
        freshness: this.getFreshnessState(kpi.last_refresh_at, kpi.freshness_sla_hours),
        latest: latestValue
          ? {
              value: Number(latestValue.value),
              target: latestValue.target !== null ? Number(latestValue.target) : undefined,
              commentary: latestValue.commentary ?? undefined,
              periodStart: latestValue.period_start,
              periodEnd: latestValue.period_end,
              variance:
                latestValue.target !== null && latestValue.target !== undefined
                  ? Number(latestValue.value) - Number(latestValue.target)
                  : undefined,
              segment: latestValue.segment,
            }
          : null,
        releaseMarkers: releases,
        incidentMarkers: incidents,
      };
    });
  }

  private segmentMatches(rowSegment: any, filterSegment?: Record<string, string>) {
    if (!filterSegment || Object.keys(filterSegment).length === 0) return true;
    const actual = typeof rowSegment === 'object' && rowSegment !== null ? rowSegment : {};
    return Object.entries(filterSegment).every(([key, value]) => actual[key] === value);
  }

  private getFreshnessState(lastRefresh: string | null, slaHours: number) {
    if (!lastRefresh) return 'red';
    const ageHours = (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60);
    if (ageHours <= slaHours) return 'green';
    if (ageHours <= slaHours * 2) return 'yellow';
    return 'red';
  }
}
