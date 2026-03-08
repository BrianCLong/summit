"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const policy_simulation_service_js_1 = require("../governance/policy-simulation-service.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
router.use(auth_js_1.ensureAuthenticated);
router.post('/simulate', async (req, res) => {
    if (process.env.POLICY_SIMULATION !== '1') {
        return res.status(403).json({
            error: 'Policy simulation feature is disabled. Set POLICY_SIMULATION=1 to enable.',
        });
    }
    try {
        const { events = [], candidatePolicy } = req.body || {};
        const result = await policy_simulation_service_js_1.defaultPolicySimulationService.runSimulation({
            events,
            candidatePolicy,
        });
        return res.json({ ok: true, result });
    }
    catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
    }
});
exports.default = router;
