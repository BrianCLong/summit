"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const security_1 = require("./security");
const policyGuard_1 = require("./middleware/policyGuard");
const search_1 = __importDefault(require("./routes/search"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "1mb" }));
app.use(security_1.security);
app.use(policyGuard_1.policyGuard);
app.use(search_1.default);
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "gateway" }));
exports.default = app;
