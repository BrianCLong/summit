"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "policy-compiler" }));
app.post("/decide", (req, res) => {
    const { query, caller } = req.body || {};
    if (!query)
        return res.status(400).json({ allow: false, reason: "missing query" });
    if ((caller && caller.purpose) === "investigation" && !/mutation|export/i.test(query)) {
        return res.json({ allow: true, reason: "allow: read for investigation" });
    }
    return res.status(403).json({ allow: false, reason: "deny: policy default" });
});
app.listen(process.env.PORT || 8080);
