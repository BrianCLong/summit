"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// services/zk-tx-svc/src/server.ts
const express_1 = __importDefault(require("express"));
const proofs_1 = require("./proofs");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
app.post("/zk/overlap", (req, res) => {
    const { selectorA, selectorB } = req.body || {};
    const overlap = selectorA && selectorB && selectorA[0] === selectorB[0]; // deterministic stub
    const pr = (0, proofs_1.makeOverlapProof)(selectorA, selectorB);
    res.json({ overlap, proofId: pr.id });
});
