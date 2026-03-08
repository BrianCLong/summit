"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulate = simulate;
const opa_1 = require("./opa");
async function simulate(s) {
    const opa = await (0, opa_1.opaEval)({
        kind: 'plan',
        changes: s.changes,
        context: s.context,
    });
    const cost = predictCost(s.changes, s.context);
    return {
        opa,
        cost,
        pass: opa.denies === 0 && cost.usd <= s.context.budgets.usd,
    };
}
