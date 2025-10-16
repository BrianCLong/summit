import { emitInvalidation } from './invalidation.js';
const defaultMap = {
    createCase: ['counts:*', 'cases:*', 'investigations:*'],
    updateCase: ['counts:*', 'cases:*', 'investigations:*'],
    deleteCase: ['counts:*', 'cases:*', 'investigations:*'],
    createInvestigation: ['counts:*', 'investigations:*'],
    updateInvestigation: ['counts:*', 'investigations:*'],
    closeInvestigation: ['counts:*', 'investigations:*'],
    deleteInvestigation: ['counts:*', 'investigations:*'],
    createIOC: ['counts:*', 'iocs:*'],
    updateIOC: ['counts:*', 'iocs:*'],
    deleteIOC: ['counts:*', 'iocs:*'],
};
function rootMutationFields(operation) {
    const sels = operation?.selectionSet?.selections || [];
    const names = new Set();
    for (const s of sels)
        if (s?.name?.value)
            names.add(s.name.value);
    return [...names];
}
export function invalidationPlugin(map = defaultMap) {
    return {
        async requestDidStart() {
            let patterns = [];
            let mutate = false;
            return {
                async didResolveOperation(ctx) {
                    try {
                        if (ctx.operation?.operation !== 'mutation')
                            return;
                        const roots = rootMutationFields(ctx.operation);
                        const hits = new Set();
                        for (const r of roots)
                            (map[r] || []).forEach((p) => hits.add(p));
                        if (hits.size) {
                            mutate = true;
                            patterns = [...hits];
                        }
                    }
                    catch { }
                },
                async willSendResponse(ctx) {
                    try {
                        if (!mutate)
                            return;
                        const hasErrors = Array.isArray(ctx?.errors) && ctx.errors.length > 0;
                        if (!hasErrors && patterns.length)
                            await emitInvalidation(patterns);
                    }
                    catch { }
                },
            };
        },
    };
}
//# sourceMappingURL=invalidationPlugin.js.map