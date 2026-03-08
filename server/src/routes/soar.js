"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SIEMPlatform_1 = require("../siem/SIEMPlatform"); // Assuming SOAR is part of SIEM for this mock
const router = (0, express_1.Router)();
const soar = new SIEMPlatform_1.SOARPlatform();
router.get('/playbooks', async (req, res) => {
    try {
        const playbooks = await soar.listPlaybooks();
        res.json(playbooks);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/playbooks/:id', async (req, res) => {
    try {
        const playbook = await soar.getPlaybook(req.params.id);
        if (!playbook) {
            return res.status(404).json({ error: 'Playbook not found' });
        }
        res.json(playbook);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/playbooks/:id/execute', async (req, res) => {
    try {
        const result = await soar.executePlaybook(req.params.id, req.body.inputs);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
