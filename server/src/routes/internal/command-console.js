"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const internal_access_js_1 = require("../../middleware/internal-access.js");
const CommandConsoleService_js_1 = require("../../services/CommandConsoleService.js");
const router = (0, express_1.Router)();
const service = new CommandConsoleService_js_1.CommandConsoleService();
router.use(internal_access_js_1.requireInternalAccess);
router.get('/summary', async (_req, res) => {
    try {
        const snapshot = await service.getSnapshot();
        res.json(snapshot);
    }
    catch (error) {
        res.status(500).json({
            error: 'failed_to_load_command_console',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/incidents', async (_req, res) => {
    try {
        const snapshot = await service.getSnapshot();
        res.json(snapshot.incidents);
    }
    catch (error) {
        res.status(500).json({
            error: 'failed_to_load_incidents',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/tenants', async (_req, res) => {
    try {
        const snapshot = await service.getSnapshot();
        res.json({
            tenants: snapshot.tenants,
            generatedAt: snapshot.generatedAt,
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'failed_to_load_tenants',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
