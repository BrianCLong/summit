"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dsl_1 = require("./dsl");
const compile_1 = require("./compile");
const r = (0, express_1.Router)();
r.post('/lac/compile', (req, res) => {
    try {
        const rules = (0, dsl_1.parse)(String(req.body?.src || ''));
        const rego = (0, compile_1.toOPA)(rules);
        res.json({ rego });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
r.post('/lac/simulate', (req, res) => {
    const { user, dataset } = req.body || {};
    const allowed = Array.isArray(user?.roles)
        && user.roles.includes('DisclosureApprover')
        && dataset?.license !== 'restricted';
    res.json({ allowed, reason: allowed ? null : 'policy_denied' });
});
exports.default = r;
