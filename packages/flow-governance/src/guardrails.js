"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceReadyChecklist = enforceReadyChecklist;
exports.enforceSliceSize = enforceSliceSize;
exports.enforceWipLimits = enforceWipLimits;
exports.enforcePrGuardrails = enforcePrGuardrails;
exports.enforceToilBudget = enforceToilBudget;
exports.identifyToilAutomationBacklog = identifyToilAutomationBacklog;
exports.deduplicateAlerts = deduplicateAlerts;
exports.autoCloseNoisyAlerts = autoCloseNoisyAlerts;
exports.enforceDecisionEscalation = enforceDecisionEscalation;
exports.enforcePreviewTtl = enforcePreviewTtl;
const DEFAULT_PR_LINE_LIMIT = 800;
const DEFAULT_PR_FILE_LIMIT = 40;
const DAY_IN_MS = 1000 * 60 * 60 * 24;
function enforceReadyChecklist(item) {
    const missing = [];
    if (!item.ready.specProvided)
        missing.push('spec');
    if (!item.ready.metricsDefined)
        missing.push('metrics');
    if (!item.ready.rollbackPlan)
        missing.push('rollback');
    if (!item.ready.ownerAssigned)
        missing.push('owner');
    if (missing.length === 0) {
        return { ok: true, severity: 'info', message: 'Ready checklist satisfied' };
    }
    return {
        ok: false,
        severity: 'block',
        message: `Ready checklist incomplete: ${missing.join(', ')}`,
    };
}
function enforceSliceSize(item) {
    if (!item.estimateDays) {
        return { ok: false, severity: 'block', message: 'Estimate missing for slice' };
    }
    if (item.estimateDays <= 5) {
        return { ok: true, severity: 'info', message: 'Slice within 5-day limit' };
    }
    if (item.riskAccepted) {
        return { ok: true, severity: 'warning', message: 'Override accepted for >5-day slice' };
    }
    return { ok: false, severity: 'block', message: 'Slice exceeds 5-day limit without override' };
}
function enforceWipLimits(workItems, limits) {
    const grouped = {};
    for (const item of workItems) {
        grouped[item.team] = grouped[item.team] ?? [];
        grouped[item.team].push(item);
    }
    return Object.entries(grouped).map(([team, items]) => {
        const limit = limits[team] ?? limits.default ?? 5;
        const currentWip = items.filter((item) => item.status !== 'done').length;
        const allowedToStart = currentWip < limit;
        return {
            team,
            limit,
            currentWip,
            allowedToStart,
            reason: allowedToStart ? undefined : 'WIP limit reached — stop starting, start finishing',
        };
    });
}
function enforcePrGuardrails(pr, lineLimit = DEFAULT_PR_LINE_LIMIT, fileLimit = DEFAULT_PR_FILE_LIMIT) {
    if (pr.linesChanged <= lineLimit && pr.filesChanged <= fileLimit) {
        return { ok: true, severity: 'info', message: 'PR within guardrails' };
    }
    if (pr.riskAccepted) {
        return {
            ok: true,
            severity: 'warning',
            message: 'PR exceeds guardrails but risk acceptance present; route to structured review',
        };
    }
    return {
        ok: false,
        severity: 'block',
        message: `PR exceeds guardrails (lines: ${pr.linesChanged}/${lineLimit}, files: ${pr.filesChanged}/${fileLimit})`,
    };
}
function enforceToilBudget(toilItems, budget) {
    const ownerHours = {};
    for (const item of toilItems) {
        ownerHours[item.owner] = (ownerHours[item.owner] ?? 0) + item.hoursPerWeek;
    }
    return Object.entries(ownerHours).map(([owner, hours]) => {
        const budgetHours = (budget.weeklyHoursPerEngineer * budget.budgetPercentage) / 100;
        return {
            owner,
            hours,
            budget: budgetHours,
            breached: hours > budgetHours,
        };
    });
}
function identifyToilAutomationBacklog(toilItems) {
    return [...toilItems]
        .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
        .slice(0, 30)
        .filter((item) => !item.automated || !item.auditLogging || !item.rollbackPlan || !item.dryRunSupported);
}
function deduplicateAlerts(alerts) {
    const seen = new Map();
    for (const alert of alerts) {
        const existing = seen.get(alert.dedupKey);
        if (!existing || alert.severity === 'critical' || alert.noiseScore < existing.noiseScore) {
            seen.set(alert.dedupKey, alert);
        }
    }
    return Array.from(seen.values());
}
function autoCloseNoisyAlerts(alerts, noiseThreshold = 0.8) {
    return alerts.filter((alert) => !(alert.severity === 'info' && alert.noiseScore >= noiseThreshold));
}
function enforceDecisionEscalation(decisions, now = new Date(), escalationWindowHours = 48) {
    const actions = [];
    for (const decision of decisions) {
        if (decision.resolvedAt)
            continue;
        const elapsedHours = (now.getTime() - decision.createdAt.getTime()) / (1000 * 60 * 60);
        if (elapsedHours < escalationWindowHours)
            continue;
        const ladder = decision.escalationLevels ?? ['owner', 'director', 'executive'];
        const nextEscalation = ladder[Math.min(ladder.length - 1, Math.floor(elapsedHours / escalationWindowHours) - 1)];
        actions.push({ id: decision.id, nextEscalation });
    }
    return actions;
}
function enforcePreviewTtl(environments, now = new Date()) {
    return environments.map((env) => {
        const expiration = env.createdAt.getTime() + env.ttlHours * 60 * 60 * 1000;
        const expired = expiration < now.getTime() || env.lastActiveAt.getTime() + DAY_IN_MS < now.getTime();
        return { id: env.id, expired, owner: env.owner };
    });
}
