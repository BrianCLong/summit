"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObligationTrackerService = void 0;
const crypto_1 = require("crypto");
const HOURS_IN_MS = 60 * 60 * 1000;
class ObligationTrackerService {
    clock;
    clauses = new Map();
    tasks = new Map();
    constructor(clock = () => new Date()) {
        this.clock = clock;
    }
    compileClauses(clauses, options = {}) {
        const horizon = options.horizonHours ?? 24 * 90;
        const compiled = [];
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
    ingestEvidence(payload) {
        const task = this.tasks.get(payload.taskId);
        if (!task) {
            throw new Error(`Task ${payload.taskId} is not registered`);
        }
        const requirement = task.evidenceRequirements.find((req) => req.id === payload.requirementId);
        if (!requirement) {
            throw new Error(`Requirement ${payload.requirementId} not found for task ${payload.taskId}`);
        }
        const record = {
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
    checkForEscalations(now = this.clock()) {
        const notices = [];
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
            const sortedLevels = [...task.escalations].sort((a, b) => a.afterHours - b.afterHours);
            for (const level of sortedLevels) {
                if (overdueHours >= level.afterHours && !task.triggeredEscalations.includes(level.id)) {
                    task.triggeredEscalations.push(level.id);
                    const notice = {
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
    exportProofPack(clauseId) {
        const clauseIds = clauseId
            ? [clauseId]
            : Array.from(this.clauses.keys()).sort();
        const clauses = clauseIds.map((id) => {
            const clause = this.clauses.get(id);
            if (!clause) {
                throw new Error(`Clause ${id} not found`);
            }
            const clauseTasks = [...this.tasks.values()]
                .filter((task) => task.clauseId === id)
                .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
            const tasks = clauseTasks.map((task) => ({
                taskId: task.id,
                name: task.name,
                status: task.status,
                dueAt: task.dueAt,
                completedAt: task.completedAt,
                evidence: task.evidenceRequirements.map((requirement) => {
                    const records = task.evidenceLog.filter((record) => record.requirementId === requirement.id);
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
    expandRule(clause, rule, horizonHours) {
        if (rule.kind === 'task') {
            return this.createTasksForRule(clause, rule, horizonHours);
        }
        if (rule.strategy === 'any') {
            throw new Error('The "any" strategy is not supported yet.');
        }
        return rule.tasks.flatMap((taskRule) => this.createTasksForRule(clause, taskRule, horizonHours));
    }
    createTasksForRule(clause, rule, horizonHours) {
        const occurrences = this.buildOccurrences(rule.frequency, horizonHours);
        return occurrences.map((occurrence) => {
            const scheduledAt = occurrence.toISOString();
            const dueAt = new Date(occurrence.getTime() + rule.slaHours * HOURS_IN_MS).toISOString();
            const taskId = this.computeTaskId(clause.id, rule.taskId, scheduledAt, dueAt);
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
    buildOccurrences(frequency, horizonHours) {
        if (frequency.type === 'once') {
            return [this.requireValidDate(frequency.at)];
        }
        const occurrences = [];
        let cursor = this.requireValidDate(frequency.start);
        const limit = cursor.getTime() + horizonHours * HOURS_IN_MS;
        while (cursor.getTime() <= limit) {
            occurrences.push(new Date(cursor));
            cursor = new Date(cursor.getTime() + frequency.intervalHours * HOURS_IN_MS);
        }
        return occurrences;
    }
    requireValidDate(input) {
        const date = new Date(input);
        if (Number.isNaN(date.getTime())) {
            throw new Error(`Invalid date value: ${input}`);
        }
        return date;
    }
    computeTaskId(clauseId, ruleTaskId, scheduledAt, dueAt) {
        const hash = (0, crypto_1.createHash)('sha1');
        hash.update([clauseId, ruleTaskId, scheduledAt, dueAt].join('|'));
        return hash.digest('hex');
    }
    isTaskEvidenceComplete(task) {
        return task.evidenceRequirements.every((requirement) => {
            if (requirement.optional) {
                return true;
            }
            return task.evidenceLog.some((record) => record.requirementId === requirement.id);
        });
    }
}
exports.ObligationTrackerService = ObligationTrackerService;
