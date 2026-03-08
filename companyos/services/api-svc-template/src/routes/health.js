"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = __importDefault(require("config"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: config_1.default.get('service.name'),
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
