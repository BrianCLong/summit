"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "zk-tx" }));
app.post("/zk/overlap", (req, res) => {
    const { selectorA, selectorB } = req.body || {};
    if (!selectorA || !selectorB)
        return res.status(400).json({ error: "missing selectors" });
    const overlap = crypto_1.default.createHash("sha256").update(selectorA).digest("hex")[0] ===
        crypto_1.default.createHash("sha256").update(selectorB).digest("hex")[0];
    return res.json({ overlap, proof: "stub" });
});
app.listen(process.env.PORT || 8080);
