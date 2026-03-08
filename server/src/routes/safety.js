"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AdversarialLabService_js_1 = require("../services/safety/AdversarialLabService.js");
const ModelAbuseWatch_js_1 = require("../services/safety/ModelAbuseWatch.js");
const router = express_1.default.Router();
const lab = new AdversarialLabService_js_1.AdversarialLabService();
const watch = new ModelAbuseWatch_js_1.ModelAbuseWatch();
router.post('/drill', async (req, res) => {
    try {
        const { endpoint } = req.body;
        const results = await lab.runPromptInjectionDrill(endpoint);
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/telemetry/abuse', (req, res) => {
    const { userId, prompt, output } = req.body;
    watch.trackRequest(userId, prompt, output);
    res.sendStatus(200);
});
exports.default = router;
