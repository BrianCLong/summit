"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlagHandler = exports.setFlagHandler = void 0;
const FlagService_js_1 = require("../services/FlagService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const setFlagHandler = async (req, res) => {
    try {
        const { name, value, ttlSeconds } = req.body;
        if (!name || value === undefined) {
            return res.status(400).json({ error: 'name and value are required' });
        }
        const userId = req.user?.id || 'unknown';
        const tenantId = req.user?.tenantId || 'system';
        await FlagService_js_1.flagService.setFlag(name, value, userId, tenantId);
        // If TTL is provided, schedule a clear (in-memory only, lost on restart)
        if (ttlSeconds && typeof ttlSeconds === 'number') {
            setTimeout(() => {
                FlagService_js_1.flagService.clearFlag(name, 'system-ttl', tenantId);
            }, ttlSeconds * 1000);
        }
        res.json({ success: true, name, value, message: 'Flag set successfully' });
    }
    catch (error) {
        logger_js_1.default.error('Error setting flag', error);
        res.status(500).json({ error: 'Failed to set flag' });
    }
};
exports.setFlagHandler = setFlagHandler;
const getFlagHandler = async (req, res) => {
    const val = FlagService_js_1.flagService.getFlag(req.params.name);
    res.json({ name: req.params.name, value: val });
};
exports.getFlagHandler = getFlagHandler;
