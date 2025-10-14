export function estimateCost(ast) {
    let cost = 1;
    if (ast.filter)
        cost += 1;
    return cost;
}
//# sourceMappingURL=costEstimator.js.map