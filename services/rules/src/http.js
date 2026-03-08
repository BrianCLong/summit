"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const engine_1 = require("./engine");
const rules_json_1 = __importDefault(require("../../.maestro/rules.json"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/hook', async (req, res) => {
    const ev = {
        kind: req.headers['x-github-event'],
        payload: req.body,
    };
    await Promise.all(rules_json_1.default.map((r) => (0, engine_1.evalRule)(ev, r)));
    res.json({ ok: true });
});
app.listen(process.env.PORT || 4080);
