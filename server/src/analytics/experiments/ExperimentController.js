"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignment = exports.stopExperiment = exports.listExperiments = exports.createExperiment = void 0;
const ExperimentService_js_1 = require("./ExperimentService.js");
const http_param_js_1 = require("../../utils/http-param.js");
const createExperiment = (req, res) => {
    try {
        const experiment = req.body;
        // Basic validation
        if (!experiment.id || !experiment.variants) {
            return res.status(400).json({ error: 'Invalid experiment payload' });
        }
        ExperimentService_js_1.experimentService.createExperiment(experiment);
        res.status(201).json(experiment);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.createExperiment = createExperiment;
const listExperiments = (req, res) => {
    const experiments = ExperimentService_js_1.experimentService.listExperiments();
    res.json(experiments);
};
exports.listExperiments = listExperiments;
const stopExperiment = (req, res) => {
    const id = (0, http_param_js_1.firstString)(req.params.id);
    if (!id)
        return res.status(400).json({ error: 'id is required' });
    ExperimentService_js_1.experimentService.stopExperiment(id);
    res.status(200).json({ status: 'stopped' });
};
exports.stopExperiment = stopExperiment;
// Internal endpoint to check assignment (useful for debugging or client-side assignment via API)
const getAssignment = (req, res) => {
    const id = (0, http_param_js_1.firstString)(req.params.id);
    if (!id)
        return res.status(400).json({ error: 'id is required' });
    const user = req.user; // Assumes auth middleware populated user
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const tenantId = user.tenant_id || 'default_tenant';
    const userId = user.sub || user.id;
    const assignment = ExperimentService_js_1.experimentService.assign(id, tenantId, userId);
    res.json(assignment);
};
exports.getAssignment = getAssignment;
