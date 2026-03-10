export function score_workflow(result: Record<string, boolean>): { pass: boolean, reason?: string, score?: number } {
    const required = ["structured_state", "validation", "evals"];

    for (const req of required) {
        if (!result[req]) {
            return { pass: false, reason: "missing required controls" };
        }
    }

    const passed = Object.values(result).filter(v => v === true).length;
    return { pass: passed >= 7, score: passed };
}
