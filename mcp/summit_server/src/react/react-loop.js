"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeReact = void 0;
const suggestForEmpty = (result) => {
    if (!result || typeof result !== 'object') {
        return undefined;
    }
    const rows = result.rows;
    if (Array.isArray(rows) && rows.length === 0) {
        return [
            'Try a broader query or different field filters.',
            'Verify scope permissions for this dataset.',
        ];
    }
    return undefined;
};
const executeReact = async (registry, context, request, maxToolCalls, executeTool) => {
    const actions = request.actions.slice(0, maxToolCalls);
    const observations = [];
    for (const action of actions) {
        registry.getTool(action.toolId);
        const result = await executeTool(action.toolId, action.input, context);
        observations.push({
            action,
            result,
            suggestions: result.ok ? suggestForEmpty(result.data) : undefined,
        });
    }
    return {
        plan: request.plan,
        observations,
    };
};
exports.executeReact = executeReact;
