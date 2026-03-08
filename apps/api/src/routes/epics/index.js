"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEpicsRouter = createEpicsRouter;
const express_1 = require("express");
const security_js_1 = require("../../middleware/security.js");
function validateStatus(status) {
    return (status === 'not_started' ||
        status === 'in_progress' ||
        status === 'completed' ||
        status === 'blocked');
}
function createEpicsRouter({ epicService, rbacManager }) {
    const router = (0, express_1.Router)();
    router.get('/', (0, security_js_1.requirePermission)(rbacManager, 'epics', 'read'), (_req, res) => {
        return res.json({ epics: epicService.list() });
    });
    router.get('/:id', (0, security_js_1.requirePermission)(rbacManager, 'epics', 'read'), (req, res) => {
        const epic = epicService.get(req.params.id);
        if (!epic) {
            return res.status(404).json({ error: 'epic_not_found' });
        }
        return res.json(epic);
    });
    router.post('/:id/tasks/:taskId/status', (0, security_js_1.requirePermission)(rbacManager, 'epics', 'update'), (req, res) => {
        const { status, note, owner } = req.body;
        if (!validateStatus(status)) {
            return res.status(400).json({
                error: 'invalid_status',
                allowed: ['not_started', 'in_progress', 'completed', 'blocked'],
            });
        }
        try {
            const updated = epicService.updateTask(req.params.id, req.params.taskId, {
                status,
                note,
                owner,
            });
            return res.json(updated);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return res.status(404).json({ error: 'task_not_found', message });
        }
    });
    return router;
}
