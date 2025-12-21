import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

type ProcurementStatus = 'pending_approval' | 'approved' | 'rejected';
type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';
type TicketStatus = 'open' | 'resolved';

type WeeklyForecast = {
  week: number;
  startDate: string;
  forecastIn: number;
  forecastOut: number;
  actualIn?: number;
  actualOut?: number;
  owner: string;
  notes: string[];
};

type EpicTask = {
  id: string;
  description: string;
  status: TaskStatus;
  owner: string;
  dueWeek?: number;
};

type Epic = {
  id: string;
  title: string;
  objective: string;
  kpis: string[];
  tasks: EpicTask[];
};

type ProcurementRequest = {
  id: string;
  vendor: string;
  description: string;
  recurring: boolean;
  monthlyAmount: number;
  status: ProcurementStatus;
  requestedBy: string;
  requestedAt: string;
  approvals: {
    cfo: boolean;
    gc: boolean;
  };
  notes?: string;
};

type VendorRenegotiation = {
  id: string;
  vendor: string;
  targetReductionPct: number;
  status: TaskStatus;
  owner: string;
  renewalDate: string;
};

type CollectionAction = {
  id: string;
  account: string;
  amountDue: number;
  amountCollected: number;
  status: TaskStatus;
  dueDate: string;
  escalationLevel: 'none' | 'dunning' | 'exec';
};

type AnomalyTicket = {
  id: string;
  week: number;
  severity: 'medium' | 'high';
  message: string;
  openedAt: string;
  status: TicketStatus;
  autoTicket: boolean;
};

type SavingsDividendRule = {
  bankPercent: number;
  reinvestPercent: number;
  thresholds: {
    runwayWeeks: number;
    maxBurnRate: number;
  };
};

type SeatReclamation = {
  id: string;
  application: string;
  seatsReclaimed: number;
  monthlyCostPerSeat: number;
  monthlySavings: number;
  executedAt: string;
  owner: string;
};

type CloudRightsizing = {
  id: string;
  description: string;
  monthlySavings: number;
  executedAt: string;
  owner: string;
};

type TurnaroundMetrics = {
  runwayWeeks: number;
  projectedBurnRate: number;
  spendCutVsPlanPct: number;
  collectionsSpeedDays: number;
  nrr: number;
  grr: number;
  churnReductionPct: number;
  cycleTimeDays: number;
  asp: number;
  incidentRecurrence: number;
  sentiment: {
    employee: number;
    customer: number;
  };
};

type TurnaroundState = {
  cashOnHand: number;
  baselineWeeklyBurn: number;
  forecast: WeeklyForecast[];
  spendFreeze: {
    active: boolean;
    killList: string[];
    updatedAt: string;
  };
  procurementRequests: ProcurementRequest[];
  vendorRenegotiations: VendorRenegotiation[];
  collectionActions: CollectionAction[];
  anomalyTickets: AnomalyTicket[];
  savingsDividend: SavingsDividendRule;
  seatReclamations: SeatReclamation[];
  cloudRightsizing: CloudRightsizing[];
  metrics: TurnaroundMetrics;
  epics: Epic[];
};

type ForecastVariance = ReturnType<TurnaroundService['buildVarianceEnvelope']>;

export class TurnaroundService {
  private statePath: string;
  private state!: TurnaroundState;
  private readyPromise: Promise<void>;

  constructor(statePath?: string) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.statePath =
      statePath ?? path.join(__dirname, '..', 'data', 'turnaround-state.json');
    this.readyPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    await mkdir(path.dirname(this.statePath), { recursive: true });
    try {
      const raw = await readFile(this.statePath, 'utf-8');
      this.state = JSON.parse(raw) as TurnaroundState;
    } catch (error) {
      logger.warn({ error }, 'Initializing default turnaround state');
      this.state = this.buildDefaultState();
      await this.persist();
    }
  }

  async ready(): Promise<void> {
    return this.readyPromise;
  }

  private async persist(): Promise<void> {
    await writeFile(this.statePath, JSON.stringify(this.state, null, 2));
  }

  private buildDefaultState(): TurnaroundState {
    const startDate = new Date('2025-01-06T00:00:00.000Z');
    const forecast: WeeklyForecast[] = Array.from({ length: 13 }, (_, i) => {
      const start = new Date(startDate);
      start.setDate(start.getDate() + i * 7);
      return {
        week: i + 1,
        startDate: start.toISOString(),
        forecastIn: 1_850_000 + 25_000 * i,
        forecastOut: 2_000_000 - 15_000 * i,
        owner: i < 4 ? 'CFO' : i < 8 ? 'FinanceOps' : 'FP&A',
        notes: [],
      };
    });

    const buildTasks = (descriptions: string[], owner: string) =>
      descriptions.map((description, idx) => ({
        id: randomUUID(),
        description,
        status: 'not_started' as TaskStatus,
        owner,
        dueWeek: Math.min(13, idx + 4),
      }));

    return {
      cashOnHand: 12_000_000,
      baselineWeeklyBurn: 2_100_000,
      forecast,
      spendFreeze: {
        active: true,
        killList: ['tooling consolidation', 'travel freeze', 'contractor pause'],
        updatedAt: new Date().toISOString(),
      },
      procurementRequests: [],
      vendorRenegotiations: Array.from({ length: 10 }, (_, i) => ({
        id: randomUUID(),
        vendor: `TopVendor-${i + 1}`,
        targetReductionPct: 15 + i,
        status: 'in_progress' as TaskStatus,
        owner: 'StrategicSourcing',
        renewalDate: new Date(startDate.getTime() + i * 6.048e8).toISOString(),
      })),
      collectionActions: [
        {
          id: randomUUID(),
          account: 'Alpha Defense',
          amountDue: 950_000,
          amountCollected: 0,
          status: 'in_progress',
          dueDate: new Date(startDate.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          escalationLevel: 'dunning',
        },
        {
          id: randomUUID(),
          account: 'Beta Research',
          amountDue: 640_000,
          amountCollected: 0,
          status: 'not_started',
          dueDate: new Date(startDate.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          escalationLevel: 'none',
        },
      ],
      anomalyTickets: [],
      savingsDividend: {
        bankPercent: 0.6,
        reinvestPercent: 0.4,
        thresholds: {
          runwayWeeks: 28,
          maxBurnRate: 1_500_000,
        },
      },
      seatReclamations: [],
      cloudRightsizing: [],
      metrics: {
        runwayWeeks: 24,
        projectedBurnRate: 1_750_000,
        spendCutVsPlanPct: 0.19,
        collectionsSpeedDays: 34,
        nrr: 1.12,
        grr: 0.92,
        churnReductionPct: 0.15,
        cycleTimeDays: 28,
        asp: 48_000,
        incidentRecurrence: 0.08,
        sentiment: {
          employee: 0.66,
          customer: 0.71,
        },
      },
      epics: [
        {
          id: 'epic-1',
          title: 'Stabilize the Cash Engine',
          objective: 'Protect runway through cash visibility and spend control.',
          kpis: ['runway weeks gained', 'variance to plan', 'collections speed'],
          tasks: buildTasks(
            [
              'Build 13-week cash forecast with weekly variance review',
              'Freeze non-essential spend with kill list enforcement',
              'Enforce procurement gate requiring CFO/GC signoff',
              'Automate invoicing/dunning and escalate top accounts',
              'Renegotiate top 10 vendor contracts for reductions',
              'Remove shelfware via SSO/SCIM seat reclamation',
              'Rightsize cloud spend with TTLs and autoscaling caps',
              'Publish weekly cash/burn dashboard with top movers',
              'Define savings dividend rule and apply every variance review',
              'Implement cost anomaly detection with auto-ticketing',
            ],
            'FinanceOps',
          ),
        },
        {
          id: 'epic-2',
          title: 'Ruthless Focus on ICP Revenue',
          objective: 'Concentrate go-to-market on high-retention ICP segments.',
          kpis: ['NRR lift', 'churn reduction', 'cycle time', 'ASP stabilization'],
          tasks: buildTasks(
            [
              'Analyze retention/LTV/churn by segment to define ICP v1',
              'Enforce no-go disqualifiers in pipeline routing',
              'Rebuild pricing/packaging around ICP value moments',
              'Standardize discount approvals with expirations',
              'Kill unprofitable channels and redeploy to high LTV',
              'Stand up renewal war room for top accounts',
              'Deploy churn defense and expansion playbooks',
              'Fix top churn drivers starting with reliability and onboarding',
              'Instrument and report NRR/GRR weekly with driver decomposition',
            ],
            'RevenueOps',
          ),
        },
        {
          id: 'epic-3',
          title: 'Org Restructure with Operating Clarity',
          objective: 'Single-threaded ownership and decision discipline.',
          kpis: ['cycle time down', 'blocked time down', 'on-call load down'],
          tasks: buildTasks(
            [
              'Publish domain ownership map with KPIs and on-call',
              'Consolidate teams around outcomes with single owners',
              'Cut cross-team dependencies on critical flows',
              'Standardize decision rights and escalation ladder',
              'Implement WIP limits and definition-of-done gates',
              'Reduce meeting load via async operating updates',
              'Establish exception registry with expiry and exec review',
              'Create leadership scorecards for reliability and velocity',
              'Run monthly org health review for toil and burnout',
            ],
            'COO',
          ),
        },
        {
          id: 'epic-4',
          title: 'Product Surface Diet',
          objective: 'Shrink product surface to core 20% and reduce maintenance.',
          kpis: ['ticket volume down', 'incident reduction', 'velocity up'],
          tasks: buildTasks(
            [
              'Rank features by revenue influence, usage, support load, incident risk',
              'Declare deprecation slate with dates and customer comms',
              'Freeze net-new features outside the core 20%',
              'Consolidate duplicate workflows into one canonical path',
              'Remove configuration permutations and use presets',
              'Retire low-value integrations and customizations',
              'Delete legacy endpoints, flags, and UI routes',
              'Update docs and support macros to match simplified surface',
              'Publish deletion releases and measure ticket reduction',
            ],
            'Product',
          ),
        },
        {
          id: 'epic-5',
          title: 'Reliability & Incident Discipline',
          objective: 'Protect renewals by hardening critical journeys.',
          kpis: ['MTTR down', 'recurrence down', 'renewal risk down'],
          tasks: buildTasks(
            [
              'Define SLOs for revenue-critical journeys with burn alerts',
              'Add progressive delivery with auto-rollback for Tier 0/1',
              'Fix top customer-visible error classes',
              'Build dependency fallbacks and degrade modes',
              'Implement idempotency on retried writes for billing/provisioning',
              'Run monthly GameDays with mitigation deadlines',
              'Enforce incident comms templates and cadence',
              'Track repeat incidents with systemic prevention items',
              'Reduce on-call toil via admin console fixes',
            ],
            'SRE',
          ),
        },
        {
          id: 'epic-6',
          title: 'Sales & Procurement Acceleration',
          objective: 'Shorten time-to-sign and time-to-cash with guardrails.',
          kpis: ['cycle time by stage', 'time-to-cash', 'win rate'],
          tasks: buildTasks(
            [
              'Create enterprise trust packet and versioned questionnaires',
              'Build procurement fast vs slow lane with SLAs',
              'Standardize contracts with fallback clauses and playbook',
              'Implement deal desk with discount guardrails',
              'Require mutual action plans above threshold deals',
              'Automate quote-to-cash checks for billing/proration/taxes',
              'Add churn/renewal metadata tracking in CRM',
              'Train Sales/CS on compliant claims and escalation triggers',
              'Track stage cycle time and kill top blockers',
            ],
            'DealDesk',
          ),
        },
        {
          id: 'epic-7',
          title: 'Monetization Hygiene',
          objective: 'Stop revenue leakage and tighten entitlements.',
          kpis: ['leakage down', 'collections speed up', 'AR down'],
          tasks: buildTasks(
            [
              'Centralize entitlements and enforce limits everywhere',
              'Audit over-grants, under-billing, and orphan access',
              'Implement metering accuracy checks and alerts',
              'Improve dunning and retries with payment health dashboards',
              'Add self-serve upgrades with proration and refund rules',
              'Reduce invoice disputes with clearer invoices and dashboards',
              'Implement cancellation flow with reason codes and offers',
              'Enforce no free-forever policy with expirations',
              'Track revenue leakage recovery weekly',
            ],
            'BillingOps',
          ),
        },
        {
          id: 'epic-8',
          title: 'Legal & Risk Containment',
          objective: 'Contain legal and regulatory exposure during cuts.',
          kpis: ['risk posture trend', 'exceptions count', 'disputes avoided'],
          tasks: buildTasks(
            [
              'Build top-10 risk register with litigation and security items',
              'Implement litigation hold and evidence preservation',
              'Tighten claims governance with proof required',
              'Review and reduce high-risk contract obligations',
              'Maintain exceptions registry with expiry and exec signoff',
              'Build incident and breach legal playbooks with comms',
              'Automate offboarding and access revocation',
              'Perform vendor risk review and terminate risky subprocessors',
              'Run quarterly tabletop combining regulator and outage scenarios',
            ],
            'Legal',
          ),
        },
        {
          id: 'epic-9',
          title: 'Turnaround Comms & Trust',
          objective: 'Control narrative with transparent internal and external comms.',
          kpis: ['churn containment', 'morale stabilization', 'narrative consistency'],
          tasks: buildTasks(
            [
              'Create clear turnaround narrative and cadence',
              'Draft customer comms templates for changes',
              'Enforce no-surprises rule for top customers',
              'Build investor and board packet for cash and KPIs',
              'Set policy for layoffs and reorg comms',
              'Create rumor-control channel with facts only',
              'Publish trust releases showing reliability and cost wins',
              'Build Q&A bank for Sales and CS',
              'Track sentiment via employee pulse and customer signals',
            ],
            'Comms',
          ),
        },
      ],
    };
  }

  private net(week: WeeklyForecast): number {
    const actualNet = (week.actualIn ?? week.forecastIn) - (week.actualOut ?? week.forecastOut);
    const planNet = week.forecastIn - week.forecastOut;
    return actualNet - planNet;
  }

  private buildVarianceEnvelope(week: WeeklyForecast) {
    const netVariance = this.net(week);
    const planNet = week.forecastIn - week.forecastOut;
    const variancePct = planNet === 0 ? 0 : netVariance / Math.abs(planNet);
    return {
      ...week,
      variance: netVariance,
      variancePct,
    };
  }

  private computeRunwayWeeks(): number {
    const forecastedBurn = this.state.forecast.reduce((acc, week) => acc + (week.forecastOut - week.forecastIn), 0);
    const averageBurn = forecastedBurn / this.state.forecast.length;
    const burn = Math.max(averageBurn, this.state.metrics.projectedBurnRate);
    if (burn <= 0) return 52;
    return Math.max(1, Math.round(this.state.cashOnHand / burn));
  }

  private computeSpendCutVsPlan(): number {
    const plan = this.state.baselineWeeklyBurn;
    const projected = this.state.metrics.projectedBurnRate;
    if (plan === 0) return 0;
    return (plan - projected) / plan;
  }

  private applySavingsDividend(variance: number, week: WeeklyForecast) {
    if (variance <= 0) {
      return { banked: 0, reinvested: 0 };
    }
    const { bankPercent, reinvestPercent, thresholds } = this.state.savingsDividend;
    const projectedRunway = this.computeRunwayWeeks();
    const shouldBankOnly =
      projectedRunway < thresholds.runwayWeeks || this.state.metrics.projectedBurnRate > thresholds.maxBurnRate;

    const bankShare = shouldBankOnly ? variance : variance * bankPercent;
    const reinvestShare = shouldBankOnly ? 0 : variance * reinvestPercent;

    this.state.cashOnHand += bankShare;
    if (reinvestShare > 0) {
      const weeklyOffset = reinvestShare / this.state.forecast.length;
      this.state.metrics.projectedBurnRate = Math.max(0, this.state.metrics.projectedBurnRate - weeklyOffset);
    }

    week.notes.push(
      `Savings dividend applied: banked ${bankShare.toFixed(2)}, reinvested ${reinvestShare.toFixed(2)} on ${new Date().toISOString()}`,
    );

    return { banked: bankShare, reinvested: reinvestShare };
  }

  async getForecast(): Promise<{ weeks: ForecastVariance[]; varianceSummary: any }> {
    await this.ready();
    const weeks = this.state.forecast.map((week) => this.buildVarianceEnvelope(week));
    const overBudget = weeks.filter((w) => w.variance > 0);
    const underBudget = weeks.filter((w) => w.variance <= 0);
    const averageVariancePct =
      weeks.length === 0
        ? 0
        : weeks.reduce((acc, w) => acc + w.variancePct, 0) / weeks.length;
    const largestVariance = weeks.reduce(
      (max, w) => (Math.abs(w.variance) > Math.abs(max.variance) ? w : max),
      weeks[0],
    );

    return {
      weeks,
      varianceSummary: {
        overBudgetWeeks: overBudget.length,
        underBudgetWeeks: underBudget.length,
        averageVariancePct,
        largestVariance: largestVariance ? {
          week: largestVariance.week,
          variance: largestVariance.variance,
          owner: largestVariance.owner,
        } : null,
      },
    };
  }

  async recordActuals(weekNumber: number, actualIn: number, actualOut: number, note?: string) {
    await this.ready();
    const target = this.state.forecast.find((w) => w.week === weekNumber);
    if (!target) {
      throw new Error('Week not found');
    }
    target.actualIn = actualIn;
    target.actualOut = actualOut;
    if (note) {
      target.notes.push(note);
    }
    this.state.metrics.runwayWeeks = this.computeRunwayWeeks();
    await this.detectCostAnomalies();
    await this.persist();
    return this.buildVarianceEnvelope(target);
  }

  async reviewWeekAndApplyDividend(weekNumber: number) {
    await this.ready();
    const week = this.state.forecast.find((w) => w.week === weekNumber);
    if (!week) {
      throw new Error('Week not found');
    }
    if (week.actualIn === undefined || week.actualOut === undefined) {
      throw new Error('Actuals must be recorded before variance review');
    }

    const variance = this.net(week);
    const dividend = this.applySavingsDividend(variance, week);
    this.state.metrics.runwayWeeks = this.computeRunwayWeeks();
    await this.persist();
    return { week: week.week, variance, dividend };
  }

  async toggleSpendFreeze(active: boolean, killList: string[]) {
    await this.ready();
    const normalizedKillList = Array.from(new Set([...this.state.spendFreeze.killList, ...killList]));
    this.state.spendFreeze = {
      active,
      killList: normalizedKillList,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.state.spendFreeze;
  }

  async createProcurementRequest(input: Omit<ProcurementRequest, 'id' | 'status' | 'requestedAt' | 'approvals'> & { recurring?: boolean }): Promise<ProcurementRequest> {
    await this.ready();
    const request: ProcurementRequest = {
      id: randomUUID(),
      vendor: input.vendor,
      description: input.description,
      recurring: input.recurring ?? true,
      monthlyAmount: input.monthlyAmount,
      status: 'pending_approval',
      requestedBy: input.requestedBy,
      requestedAt: new Date().toISOString(),
      approvals: { cfo: false, gc: false },
    };
    this.state.procurementRequests.push(request);
    await this.persist();
    return request;
  }

  async approveProcurement(id: string, role: string): Promise<ProcurementRequest> {
    await this.ready();
    const request = this.state.procurementRequests.find((r) => r.id === id);
    if (!request) {
      throw new Error('Procurement request not found');
    }
    if (!['cfo', 'gc'].includes(role)) {
      throw new Error('Only CFO or GC can approve');
    }
    if (role === 'cfo') request.approvals.cfo = true;
    if (role === 'gc') request.approvals.gc = true;

    if (request.approvals.cfo && request.approvals.gc) {
      request.status = 'approved';
    }
    await this.persist();
    return request;
  }

  async rejectProcurement(id: string, reason: string): Promise<ProcurementRequest> {
    await this.ready();
    const request = this.state.procurementRequests.find((r) => r.id === id);
    if (!request) {
      throw new Error('Procurement request not found');
    }
    request.status = 'rejected';
    request.notes = reason;
    await this.persist();
    return request;
  }

  async updateVendorRenegotiation(
    id: string,
    update: Partial<VendorRenegotiation> & { achievedReductionPct?: number },
  ): Promise<VendorRenegotiation> {
    await this.ready();
    const renegotiation = this.state.vendorRenegotiations.find((v) => v.id === id);
    if (!renegotiation) {
      throw new Error('Vendor renegotiation not found');
    }

    Object.assign(renegotiation, update);

    if (update.achievedReductionPct !== undefined) {
      const effectiveReduction = Math.max(0, update.achievedReductionPct);
      const weeklySavings = (this.state.baselineWeeklyBurn * effectiveReduction) / 100;
      this.state.metrics.projectedBurnRate = Math.max(0, this.state.metrics.projectedBurnRate - weeklySavings);
    }

    await this.persist();
    return renegotiation;
  }

  async listProcurements(): Promise<ProcurementRequest[]> {
    await this.ready();
    return this.state.procurementRequests;
  }

  async updateTaskStatus(epicId: string, taskId: string, status: TaskStatus): Promise<EpicTask> {
    await this.ready();
    const epic = this.state.epics.find((e) => e.id === epicId);
    if (!epic) {
      throw new Error('Epic not found');
    }
    const task = epic.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    task.status = status;
    await this.persist();
    return task;
  }

  async listEpics(): Promise<Epic[]> {
    await this.ready();
    return this.state.epics;
  }

  async listAnomalies(): Promise<AnomalyTicket[]> {
    await this.ready();
    return this.state.anomalyTickets;
  }

  private upsertAnomalyTicket(week: number, severity: 'medium' | 'high', message: string) {
    const existing = this.state.anomalyTickets.find((t) => t.week === week && t.status === 'open');
    if (existing) {
      existing.message = message;
      existing.severity = severity;
      return existing;
    }
    const ticket: AnomalyTicket = {
      id: randomUUID(),
      week,
      severity,
      message,
      openedAt: new Date().toISOString(),
      status: 'open',
      autoTicket: true,
    };
    this.state.anomalyTickets.push(ticket);
    return ticket;
  }

  async detectCostAnomalies(): Promise<AnomalyTicket[]> {
    await this.ready();
    const tickets: AnomalyTicket[] = [];
    for (const week of this.state.forecast) {
      if (week.actualIn === undefined || week.actualOut === undefined) continue;
      const planNet = week.forecastIn - week.forecastOut;
      const actualNet = week.actualIn - week.actualOut;
      const variance = actualNet - planNet;
      const magnitude = Math.abs(planNet) === 0 ? 0 : Math.abs(variance / planNet);
      if (magnitude >= 0.08) {
        const severity = magnitude > 0.15 ? 'high' : 'medium';
        tickets.push(
          this.upsertAnomalyTicket(
            week.week,
            severity,
            `Week ${week.week} variance ${variance.toFixed(2)} (${(magnitude * 100).toFixed(1)}%)`,
          ),
        );
      }
    }
    await this.persist();
    return tickets;
  }

  async recordCollectionAction(update: Partial<CollectionAction> & { id: string }): Promise<CollectionAction> {
    await this.ready();
    const action = this.state.collectionActions.find((a) => a.id === update.id);
    if (!action) {
      throw new Error('Collection action not found');
    }
    Object.assign(action, update);
    await this.persist();
    return action;
  }

  async recordCollectionPayment(id: string, amount: number): Promise<CollectionAction> {
    await this.ready();
    const action = this.state.collectionActions.find((a) => a.id === id);
    if (!action) {
      throw new Error('Collection action not found');
    }
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    action.amountCollected += amount;
    if (action.amountCollected >= action.amountDue) {
      action.status = 'complete';
      action.escalationLevel = 'none';
    } else if (action.status === 'not_started') {
      action.status = 'in_progress';
    }
    await this.persist();
    return action;
  }

  async escalateCollection(id: string, escalationLevel: CollectionAction['escalationLevel']): Promise<CollectionAction> {
    await this.ready();
    const action = this.state.collectionActions.find((a) => a.id === id);
    if (!action) {
      throw new Error('Collection action not found');
    }
    action.escalationLevel = escalationLevel;
    if (action.status === 'not_started') {
      action.status = 'in_progress';
    }
    await this.persist();
    return action;
  }

  async reclaimShelfware(input: Omit<SeatReclamation, 'id' | 'monthlySavings' | 'executedAt'>): Promise<SeatReclamation> {
    await this.ready();
    const monthlySavings = input.seatsReclaimed * input.monthlyCostPerSeat;
    const record: SeatReclamation = {
      ...input,
      id: randomUUID(),
      monthlySavings,
      executedAt: new Date().toISOString(),
    };
    this.state.seatReclamations.push(record);
    const weeklySavings = monthlySavings / 4;
    this.state.metrics.projectedBurnRate = Math.max(0, this.state.metrics.projectedBurnRate - weeklySavings);
    await this.persist();
    return record;
  }

  async applyCloudRightsizing(input: Omit<CloudRightsizing, 'id' | 'executedAt'>): Promise<CloudRightsizing> {
    await this.ready();
    const record: CloudRightsizing = {
      ...input,
      id: randomUUID(),
      executedAt: new Date().toISOString(),
    };
    this.state.cloudRightsizing.push(record);
    const weeklySavings = input.monthlySavings / 4;
    this.state.metrics.projectedBurnRate = Math.max(0, this.state.metrics.projectedBurnRate - weeklySavings);
    await this.persist();
    return record;
  }

  async getDashboard() {
    await this.ready();
    const forecast = await this.getForecast();
    const topMovers = [...forecast.weeks]
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 5)
      .map(({ week, variance, owner }) => ({ week, variance, owner }));

    const procurementGate = {
      pending: this.state.procurementRequests.filter((r) => r.status === 'pending_approval').length,
      requiresApprover: ['cfo', 'gc'],
    };

    const collections = this.state.collectionActions.map((action) => ({
      account: action.account,
      amountDue: action.amountDue,
      status: action.status,
      escalationLevel: action.escalationLevel,
    }));

    const savingsDividend = {
      rule: this.state.savingsDividend,
      lastAppliedAt: forecast.weeks.find((w) => w.notes.length > 0)?.notes?.slice(-1)[0],
    };

    return {
      forecast,
      metrics: {
        ...this.state.metrics,
        runwayWeeks: this.computeRunwayWeeks(),
        spendCutVsPlanPct: this.computeSpendCutVsPlan(),
      },
      spendFreeze: this.state.spendFreeze,
      procurementGate,
      collections,
      vendorRenegotiations: this.state.vendorRenegotiations,
      anomalyTickets: this.state.anomalyTickets,
      seatReclamations: this.state.seatReclamations,
      cloudRightsizing: this.state.cloudRightsizing,
      savingsDividend,
      topMovers,
    };
  }
}

export default TurnaroundService;
