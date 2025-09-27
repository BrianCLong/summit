import { createHash } from 'crypto';

export type ObligationClause = {
  id: string;
  title: string;
  description?: string;
  rule: ClauseRule;
};

export type ClauseRule = TaskClauseRule | CompositeClauseRule;

export type FrequencyRule =
  | { type: 'once'; at: string }
  | { type: 'recurring'; start: string; intervalHours: number };

export interface EvidenceRequirement {
  id: string;
  description: string;
  optional?: boolean;
}

export interface EscalationLevel {
  id: string;
  afterHours: number;
  contact: string;
  instructions?: string;
}

export interface TaskClauseRule {
  kind: 'task';
  taskId: string;
  name: string;
  summary?: string;
  frequency: FrequencyRule;
  slaHours: number;
  evidence: EvidenceRequirement[];
  escalations: EscalationLevel[];
}

export interface CompositeClauseRule {
  kind: 'composite';
  strategy: 'all' | 'any';
  tasks: TaskClauseRule[];
}

export type TaskStatus = 'pending' | 'completed' | 'overdue';

export interface EvidenceRecord {
  requirementId: string;
  evidenceId: string;
  location: string;
  submittedAt: string;
  submittedBy: string;
  provider?: string;
}

export interface ScheduledTask {
  id: string;
  clauseId: string;
  clauseTitle: string;
  ruleTaskId: string;
  name: string;
  summary?: string;
  scheduledAt: string;
  dueAt: string;
  status: TaskStatus;
  evidenceRequirements: EvidenceRequirement[];
  evidenceLog: EvidenceRecord[];
  escalations: EscalationLevel[];
  triggeredEscalations: string[];
  completedAt?: string;
}

export interface EvidenceWebhookPayload {
  taskId: string;
  requirementId: string;
  evidenceId: string;
  location: string;
  submittedAt: string;
  submittedBy: string;
  provider?: string;
}

export interface EvidenceIngestionResult {
  accepted: boolean;
  taskStatus: TaskStatus;
  complete: boolean;
}

export interface EscalationNotice {
  taskId: string;
  clauseId: string;
  clauseTitle: string;
  level: EscalationLevel;
  triggeredAt: string;
  overdueHours: number;
}

export interface ProofPack {
  generatedAt: string;
  complete: boolean;
  clauses: ProofPackClause[];
}

export interface ProofPackClause {
  clauseId: string;
  title: string;
  description?: string;
  complete: boolean;
  tasks: ProofPackTask[];
}

export interface ProofPackTask {
  taskId: string;
  name: string;
  status: TaskStatus;
  dueAt: string;
  completedAt?: string;
  evidence: ProofPackEvidence[];
}

export interface ProofPackEvidence {
  requirementId: string;
  description: string;
  provided: boolean;
  records: EvidenceRecord[];
}

type Clock = () => Date;

interface CompileOptions {
  horizonHours?: number;
}

const HOURS_IN_MS = 60 * 60 * 1000;

export class ObligationTrackerService {
  private readonly clock: Clock;
  private readonly clauses = new Map<string, ObligationClause>();
  private readonly tasks = new Map<string, ScheduledTask>();

  constructor(clock: Clock = () => new Date()) {
    this.clock = clock;
  }

  compileClauses(
    clauses: ObligationClause[],
    options: CompileOptions = {}
  ): ScheduledTask[] {
    const horizon = options.horizonHours ?? 24 * 90;
    const compiled: ScheduledTask[] = [];

    for (const clause of clauses) {
      this.clauses.set(clause.id, clause);
      const clauseTasks = this.expandRule(clause, clause.rule, horizon);
      for (const task of clauseTasks) {
        this.tasks.set(task.id, task);
        compiled.push(task);
      }
    }

    return compiled;
  }

  ingestEvidence(payload: EvidenceWebhookPayload): EvidenceIngestionResult {
    const task = this.tasks.get(payload.taskId);
    if (!task) {
      throw new Error(`Task ${payload.taskId} is not registered`);
    }

    const requirement = task.evidenceRequirements.find(
      (req) => req.id === payload.requirementId
    );

    if (!requirement) {
      throw new Error(
        `Requirement ${payload.requirementId} not found for task ${payload.taskId}`
      );
    }

    const record: EvidenceRecord = {
      requirementId: payload.requirementId,
      evidenceId: payload.evidenceId,
      location: payload.location,
      submittedAt: payload.submittedAt,
      submittedBy: payload.submittedBy,
      provider: payload.provider,
    };

    task.evidenceLog.push(record);

    const complete = this.isTaskEvidenceComplete(task);
    if (complete) {
      task.status = 'completed';
      task.completedAt = payload.submittedAt;
    }

    return {
      accepted: true,
      taskStatus: task.status,
      complete,
    };
  }

  checkForEscalations(now: Date = this.clock()): EscalationNotice[] {
    const notices: EscalationNotice[] = [];

    for (const task of this.tasks.values()) {
      if (task.status === 'completed') {
        continue;
      }

      const dueAt = new Date(task.dueAt);
      const overdueMs = now.getTime() - dueAt.getTime();

      if (overdueMs <= 0) {
        continue;
      }

      task.status = 'overdue';
      const overdueHours = overdueMs / HOURS_IN_MS;

      const sortedLevels = [...task.escalations].sort(
        (a, b) => a.afterHours - b.afterHours
      );

      for (const level of sortedLevels) {
        if (overdueHours >= level.afterHours && !task.triggeredEscalations.includes(level.id)) {
          task.triggeredEscalations.push(level.id);
          const notice: EscalationNotice = {
            taskId: task.id,
            clauseId: task.clauseId,
            clauseTitle: task.clauseTitle,
            level,
            triggeredAt: now.toISOString(),
            overdueHours,
          };
          notices.push(notice);
        }
      }
    }

    return notices;
  }

  exportProofPack(clauseId?: string): ProofPack {
    const clauseIds = clauseId
      ? [clauseId]
      : Array.from(this.clauses.keys()).sort();

    const clauses: ProofPackClause[] = clauseIds.map((id) => {
      const clause = this.clauses.get(id);
      if (!clause) {
        throw new Error(`Clause ${id} not found`);
      }

      const clauseTasks = [...this.tasks.values()]
        .filter((task) => task.clauseId === id)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

      const tasks: ProofPackTask[] = clauseTasks.map((task) => ({
        taskId: task.id,
        name: task.name,
        status: task.status,
        dueAt: task.dueAt,
        completedAt: task.completedAt,
        evidence: task.evidenceRequirements.map((requirement) => {
          const records = task.evidenceLog.filter(
            (record) => record.requirementId === requirement.id
          );
          return {
            requirementId: requirement.id,
            description: requirement.description,
            provided: records.length > 0 || Boolean(requirement.optional),
            records,
          };
        }),
      }));

      const complete = tasks.every((task) => {
        if (task.status !== 'completed') {
          return false;
        }

        return task.evidence.every((entry) => entry.provided);
      });

      return {
        clauseId: id,
        title: clause.title,
        description: clause.description,
        complete,
        tasks,
      };
    });

    const complete = clauses.every((clause) => clause.complete);

    return {
      generatedAt: this.clock().toISOString(),
      complete,
      clauses,
    };
  }

  private expandRule(
    clause: ObligationClause,
    rule: ClauseRule,
    horizonHours: number
  ): ScheduledTask[] {
    if (rule.kind === 'task') {
      return this.createTasksForRule(clause, rule, horizonHours);
    }

    if (rule.strategy === 'any') {
      throw new Error('The "any" strategy is not supported yet.');
    }

    return rule.tasks.flatMap((taskRule) =>
      this.createTasksForRule(clause, taskRule, horizonHours)
    );
  }

  private createTasksForRule(
    clause: ObligationClause,
    rule: TaskClauseRule,
    horizonHours: number
  ): ScheduledTask[] {
    const occurrences = this.buildOccurrences(rule.frequency, horizonHours);

    return occurrences.map((occurrence) => {
      const scheduledAt = occurrence.toISOString();
      const dueAt = new Date(
        occurrence.getTime() + rule.slaHours * HOURS_IN_MS
      ).toISOString();
      const taskId = this.computeTaskId(
        clause.id,
        rule.taskId,
        scheduledAt,
        dueAt
      );

      const existing = this.tasks.get(taskId);
      if (existing) {
        return existing;
      }

      return {
        id: taskId,
        clauseId: clause.id,
        clauseTitle: clause.title,
        ruleTaskId: rule.taskId,
        name: rule.name,
        summary: rule.summary,
        scheduledAt,
        dueAt,
        status: 'pending',
        evidenceRequirements: [...rule.evidence],
        evidenceLog: [],
        escalations: [...rule.escalations],
        triggeredEscalations: [],
      };
    });
  }

  private buildOccurrences(
    frequency: FrequencyRule,
    horizonHours: number
  ): Date[] {
    if (frequency.type === 'once') {
      return [this.requireValidDate(frequency.at)];
    }

    const occurrences: Date[] = [];
    let cursor = this.requireValidDate(frequency.start);
    const limit = cursor.getTime() + horizonHours * HOURS_IN_MS;

    while (cursor.getTime() <= limit) {
      occurrences.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + frequency.intervalHours * HOURS_IN_MS);
    }

    return occurrences;
  }

  private requireValidDate(input: string): Date {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date value: ${input}`);
    }
    return date;
  }

  private computeTaskId(
    clauseId: string,
    ruleTaskId: string,
    scheduledAt: string,
    dueAt: string
  ): string {
    const hash = createHash('sha1');
    hash.update([clauseId, ruleTaskId, scheduledAt, dueAt].join('|'));
    return hash.digest('hex');
  }

  private isTaskEvidenceComplete(task: ScheduledTask): boolean {
    return task.evidenceRequirements.every((requirement) => {
      if (requirement.optional) {
        return true;
      }
      return task.evidenceLog.some(
        (record) => record.requirementId === requirement.id
      );
    });
  }
}
