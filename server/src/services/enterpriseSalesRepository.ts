import crypto from 'node:crypto';
import { ManagedPostgresPool } from '../db/postgres.js';

export type MapMilestoneStatus = 'planned' | 'in-progress' | 'done' | 'blocked';

export interface MapMilestone {
  name: string;
  dueDate: string;
  owner?: string;
  status: MapMilestoneStatus;
  risk?: string;
}

export interface MutualActionPlan {
  owner: string;
  nextStep: string;
  milestones: MapMilestone[];
  risks?: string[];
}

export interface Dossier {
  orgChart: string[];
  initiatives: string[];
  stack: string[];
  pains: string[];
  budgets: { amount: number; approved: boolean; window: string }[];
  timing: string;
}

export interface ProcurementReadiness {
  fastLane: boolean;
  slaHours: number;
  redlineGuardrails: string[];
  controlEvidence: string[];
  pricingGuardrails: string;
  slaBreaches: number;
  avgCycleTimeDays: number;
}

export interface PocPlan {
  status: 'pending' | 'active' | 'healthy' | 'at-risk' | 'complete';
  targetDays: number;
  timeToFirstValueDays?: number;
  observability: string[];
  benchmarks: string[];
}

export interface DeploymentReadiness {
  sso: boolean;
  scim: boolean;
  rbacTemplates: boolean;
  auditLogs: boolean;
  drRpoHours: number;
  drRtoHours: number;
  siem: boolean;
}

export interface RenewalPlan {
  renewalDate: string;
  qbrCadence: 'monthly' | 'quarterly';
  riskFlags: string[];
  execSponsor: string;
}

export interface ExpansionPlan {
  triggers: string[];
  playbooks: string[];
  stickinessFeatures: string[];
}

export interface RiskEntry {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
}

export interface AccountMetrics {
  execTouches: number;
  mapSigned: boolean;
  championStrength: number;
  championEngagements: number;
  pocCycleDays?: number;
  procurementCycleDays?: number;
  renewalRisk?: string;
}

export interface EnterpriseSalesAccount {
  id?: string;
  name: string;
  icpFit: number;
  arrPotential: number;
  strategicValue: number;
  accountGeneral: string;
  stopLossRule: string;
  exitCriteria: string;
  map: MutualActionPlan;
  dossier: Dossier;
  winThemes: string[];
  procurement: ProcurementReadiness;
  poc: PocPlan;
  deployment: DeploymentReadiness;
  renewal: RenewalPlan;
  expansion: ExpansionPlan;
  riskRegister: RiskEntry[];
  metrics: AccountMetrics;
  coverageScore: number;
  predictiveScore: number;
  overallScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ActivityType =
  | 'EXEC_TOUCH'
  | 'MAP_MILESTONE'
  | 'PROCUREMENT_SLA'
  | 'POC_HEALTH'
  | 'RISK'
  | 'CHAMPION_SESSION';

export interface EnterpriseSalesActivity {
  accountId: string;
  type: ActivityType;
  payload: Record<string, any>;
}

export interface EnterpriseSalesRepository {
  upsertAccount(account: EnterpriseSalesAccount): Promise<EnterpriseSalesAccount>;
  getAccountById(id: string): Promise<EnterpriseSalesAccount | null>;
  listAccounts(limit: number): Promise<EnterpriseSalesAccount[]>;
  recordActivity(activity: EnterpriseSalesActivity): Promise<void>;
}

export class PostgresEnterpriseSalesRepository implements EnterpriseSalesRepository {
  constructor(private readonly pool: ManagedPostgresPool) {}

  async upsertAccount(account: EnterpriseSalesAccount): Promise<EnterpriseSalesAccount> {
    const result = await this.pool.query(
      `INSERT INTO enterprise_sales_accounts (
        id, name, icp_fit, arr_potential, strategic_value, account_general,
        stop_loss_rule, exit_criteria, map, dossier, win_themes, procurement, poc,
        deployment, renewal, expansion, risk_register, metrics, coverage_score,
        predictive_score, overall_score
      ) VALUES (
        COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6,
        $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb,
        $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb, $19, $20, $21
      )
      ON CONFLICT(name)
      DO UPDATE SET
        icp_fit = EXCLUDED.icp_fit,
        arr_potential = EXCLUDED.arr_potential,
        strategic_value = EXCLUDED.strategic_value,
        account_general = EXCLUDED.account_general,
        stop_loss_rule = EXCLUDED.stop_loss_rule,
        exit_criteria = EXCLUDED.exit_criteria,
        map = EXCLUDED.map,
        dossier = EXCLUDED.dossier,
        win_themes = EXCLUDED.win_themes,
        procurement = EXCLUDED.procurement,
        poc = EXCLUDED.poc,
        deployment = EXCLUDED.deployment,
        renewal = EXCLUDED.renewal,
        expansion = EXCLUDED.expansion,
        risk_register = EXCLUDED.risk_register,
        metrics = EXCLUDED.metrics,
        coverage_score = EXCLUDED.coverage_score,
        predictive_score = EXCLUDED.predictive_score,
        overall_score = EXCLUDED.overall_score
      RETURNING *`,
      [
        account.id ?? null,
        account.name,
        account.icpFit,
        account.arrPotential,
        account.strategicValue,
        account.accountGeneral,
        account.stopLossRule,
        account.exitCriteria,
        JSON.stringify(account.map),
        JSON.stringify(account.dossier),
        JSON.stringify(account.winThemes),
        JSON.stringify(account.procurement),
        JSON.stringify(account.poc),
        JSON.stringify(account.deployment),
        JSON.stringify(account.renewal),
        JSON.stringify(account.expansion),
        JSON.stringify(account.riskRegister),
        JSON.stringify(account.metrics),
        account.coverageScore,
        account.predictiveScore,
        account.overallScore,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async getAccountById(id: string): Promise<EnterpriseSalesAccount | null> {
    const result = await this.pool.query(
      'SELECT * FROM enterprise_sales_accounts WHERE id = $1',
      [id],
    );
    if (result.rowCount === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async listAccounts(limit: number): Promise<EnterpriseSalesAccount[]> {
    const result = await this.pool.query(
      'SELECT * FROM enterprise_sales_accounts ORDER BY overall_score DESC LIMIT $1',
      [limit],
    );
    return result.rows.map((row: any) => this.mapRow(row));
  }

  async recordActivity(activity: EnterpriseSalesActivity): Promise<void> {
    await this.pool.query(
      `INSERT INTO enterprise_sales_activity_log (account_id, activity_type, payload)
       VALUES ($1, $2, $3::jsonb)`,
      [activity.accountId, activity.type, JSON.stringify(activity.payload)],
    );
  }

  private mapRow(row: any): EnterpriseSalesAccount {
    return {
      id: row.id,
      name: row.name,
      icpFit: Number(row.icp_fit),
      arrPotential: Number(row.arr_potential),
      strategicValue: Number(row.strategic_value),
      accountGeneral: row.account_general,
      stopLossRule: row.stop_loss_rule,
      exitCriteria: row.exit_criteria,
      map: row.map,
      dossier: row.dossier,
      winThemes: row.win_themes,
      procurement: row.procurement,
      poc: row.poc,
      deployment: row.deployment,
      renewal: row.renewal,
      expansion: row.expansion,
      riskRegister: row.risk_register,
      metrics: row.metrics,
      coverageScore: Number(row.coverage_score),
      predictiveScore: Number(row.predictive_score),
      overallScore: Number(row.overall_score),
      createdAt: row.created_at?.toString(),
      updatedAt: row.updated_at?.toString(),
    };
  }
}

export class InMemoryEnterpriseSalesRepository implements EnterpriseSalesRepository {
  private accounts = new Map<string, EnterpriseSalesAccount>();
  private activities: EnterpriseSalesActivity[] = [];

  async upsertAccount(account: EnterpriseSalesAccount): Promise<EnterpriseSalesAccount> {
    const existing = Array.from(this.accounts.values()).find(
      (a) => a.id === account.id || a.name === account.name,
    );
    const id = existing?.id ?? account.id ?? crypto.randomUUID();
    const createdAt = existing?.createdAt ?? account.createdAt ?? new Date().toISOString();
    const stored: EnterpriseSalesAccount = {
      ...account,
      id,
      createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.accounts.set(id, stored);
    return stored;
  }

  async getAccountById(id: string): Promise<EnterpriseSalesAccount | null> {
    const found = this.accounts.get(id) || Array.from(this.accounts.values()).find((a) => a.name === id);
    return found ? { ...found } : null;
  }

  async listAccounts(limit: number): Promise<EnterpriseSalesAccount[]> {
    return Array.from(this.accounts.values())
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit)
      .map((account) => ({ ...account }));
  }

  async recordActivity(activity: EnterpriseSalesActivity): Promise<void> {
    this.activities.push(activity);
  }
}
