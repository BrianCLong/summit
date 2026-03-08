"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEnforce = setEnforce;
exports.killIfSlow = killIfSlow;
exports.guard = guard;
let ENFORCE = process.env.COST_GUARD_ENFORCE === '1';
function setEnforce(enabled) {
    ENFORCE = enabled;
}
function killIfSlow(start, res) {
    const ms = Date.now() - start;
    if (ENFORCE && ms > Number(process.env.SLO_MS || 500)) {
        res.status(503).end();
    }
}
function guard(req, res, next) {
    const t = Date.now();
    res.on('finish', () => killIfSlow(t, res));
    next();
}
