"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plan = plan;
function plan(req) {
    return { remoteFilters: [req.predicate], expectedCost: 10 };
}
