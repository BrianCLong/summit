export function enforceBudget(ast, budget) {
    if (ast.expands && ast.expands > budget.maxExpand) {
        throw new Error('budget_expansion_exceeded');
    }
    if (ast.rows && ast.rows > budget.maxRows) {
        throw new Error('budget_rows_exceeded');
    }
    return budget;
}
//# sourceMappingURL=QueryBudgetGuard.js.map