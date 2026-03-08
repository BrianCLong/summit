"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const guard_1 = require("./guard");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/copilot/plan', (req, res) => {
    const plan = 'MATCH (n) RETURN n LIMIT 10';
    res.json({ plan, cost: (0, guard_1.estimate)(plan) });
});
app.post('/copilot/execute', (req, res) => {
    const { cypher } = req.body || {};
    try {
        (0, guard_1.forbidDangerous)(String(cypher || ''));
    }
    catch (_e) {
        return res.status(400).json({ error: 'dangerous_query' });
    }
    res.json({ sandbox: req.query.sandbox === 'true', rows: [] });
});
exports.default = app;
