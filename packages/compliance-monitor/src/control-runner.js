"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlScheduler = exports.ControlRunner = void 0;
class ControlRunner {
    evidenceStore;
    alertBroker;
    health = new Map();
    handlerLookup;
    constructor(options) {
        this.evidenceStore = options.evidenceStore;
        this.alertBroker = options.alertBroker;
        this.handlerLookup = new Map(Object.entries(options.handlers));
    }
    async run(control, now = new Date()) {
        const handler = this.handlerLookup.get(control.id);
        if (!handler && control.check.type === 'automated') {
            throw new Error(`No handler registered for automated control ${control.id}`);
        }
        const result = handler ? await handler(control) : { status: 'manual-required' };
        let evidence;
        let failureReason;
        if (result.evidencePayload) {
            evidence = await this.evidenceStore.storeEvidence(control.id, result.evidencePayload, {
                signer: control.evidence.signer,
                ttlDays: control.evidence.ttlDays,
                retentionDays: control.evidence.retentionDays,
                metadata: result.metadata,
            });
        }
        if (result.status === 'fail') {
            failureReason = result.notes || 'Control check failed';
            this.alertBroker.publish({
                controlId: control.id,
                type: 'failure',
                message: failureReason,
                metadata: { category: control.category, owner: control.owner.primary },
                createdAt: now,
            });
        }
        const nextRunAt = new Date(now.getTime() + control.schedule.frequencyMinutes * 60 * 1000);
        const record = {
            controlId: control.id,
            status: result.status,
            lastRunAt: now,
            nextRunAt,
            evidence,
            failureReason,
            driftMinutes: 0,
        };
        this.health.set(control.id, record);
        return record;
    }
    evaluateDrift(control, now = new Date()) {
        const record = this.health.get(control.id);
        if (!record)
            return undefined;
        const tolerance = control.schedule.toleranceMinutes;
        const driftMinutes = Math.max(0, (now.getTime() - record.lastRunAt.getTime()) / 60000 - control.schedule.frequencyMinutes);
        const updated = { ...record, driftMinutes };
        this.health.set(control.id, updated);
        if (driftMinutes > tolerance) {
            this.alertBroker.publish({
                controlId: control.id,
                type: 'stale-evidence',
                message: `Evidence stale by ${driftMinutes.toFixed(1)} minutes`,
                metadata: { toleranceMinutes: tolerance },
                createdAt: now,
            });
        }
        return updated;
    }
    getHealth() {
        return Array.from(this.health.values());
    }
}
exports.ControlRunner = ControlRunner;
class ControlScheduler {
    runner;
    controls;
    constructor(controls, runner) {
        this.controls = controls;
        this.runner = runner;
    }
    async tick(now = new Date()) {
        const executions = [];
        for (const control of this.controls) {
            const existing = this.runner.getHealth().find(h => h.controlId === control.id);
            if (!existing || existing.nextRunAt <= now) {
                executions.push(await this.runner.run(control, now));
            }
            else {
                const updated = this.runner.evaluateDrift(control, now);
                if (updated) {
                    executions.push(updated);
                }
            }
        }
        return executions;
    }
}
exports.ControlScheduler = ControlScheduler;
