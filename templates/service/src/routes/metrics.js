"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prom_client_1 = __importDefault(require("prom-client"));
const router = (0, express_1.Router)();
// Collect default metrics
prom_client_1.default.collectDefaultMetrics();
router.get('/metrics', async (req, res) => {
    res.set('Content-Type', prom_client_1.default.register.contentType);
    res.end(await prom_client_1.default.register.metrics());
});
exports.default = router;
