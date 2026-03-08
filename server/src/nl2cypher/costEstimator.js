"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateCost = estimateCost;
function estimateCost(ast) {
    let cost = 1;
    if (ast.filter)
        cost += 1;
    return cost;
}
