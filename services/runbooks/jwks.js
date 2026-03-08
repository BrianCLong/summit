"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
exports.default = (0, express_1.Router)().get('/.well-known/jwks.json', (_req, res) => {
    // rotate via CI; keys[] contains active and next
    res.json({ keys: JSON.parse(process.env.RUNBOOK_JWKS_JSON || '[]') });
});
