"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citationGateContext = citationGateContext;
exports.applyCitationGateStatus = applyCitationGateStatus;
const citation_gate_js_1 = require("../services/graphrag/citation-gate.js");
function citationGateContext(_req, res, next) {
    res.locals.citationGate = (0, citation_gate_js_1.isCitationGateEnabled)();
    next();
}
function applyCitationGateStatus(response, res) {
    if (!res.locals.citationGate) {
        return response;
    }
    const hasMissing = Boolean(response.citationDiagnostics?.missingCitations);
    const hasDangling = Boolean(response.citationDiagnostics?.danglingCitations);
    if (hasMissing || hasDangling) {
        res.status(422);
    }
    return response;
}
