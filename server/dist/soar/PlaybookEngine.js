export class PlaybookEngine {
    constructor(actions) {
        this.actions = actions;
    }
    async run(pb, inputs, ctx) {
        const results = [];
        for (const step of pb.spec.steps) {
            const dry = step.mode === 'dry-run' || ctx.dryRunDefault;
            if (step.requiresApproval && !ctx.approver) {
                results.push({ id: step.id, status: 'approved' });
                continue;
            }
            if (dry) {
                results.push({ id: step.id, status: 'dry-run' });
                continue;
            }
            const exec = this.actions[step.action];
            if (!exec)
                throw new Error('action_not_found');
            try {
                const out = await exec(step.params, { ...ctx, inputs });
                results.push({ id: step.id, status: 'executed', output: out });
            }
            catch (e) {
                results.push({ id: step.id, status: 'failed', error: e.message });
            }
        }
        return results;
    }
}
//# sourceMappingURL=PlaybookEngine.js.map