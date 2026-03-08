"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPGServe = startPGServe;
const express_1 = __importDefault(require("express"));
const validatePlaybook_1 = require("./validate/validatePlaybook");
const matchPlaybook_1 = require("./engine/matchPlaybook");
const playbook_defensive_example_json_1 = __importDefault(require("./fixtures/playbook.defensive.example.json"));
const evidence_sample_json_1 = __importDefault(require("./fixtures/evidence.sample.json"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// POST /pg/validate-playbook
app.post('/pg/validate-playbook', (req, res) => {
    const playbook = req.body;
    if (!playbook) {
        return res.status(400).json({ error: 'Missing playbook in request body' });
    }
    const report = (0, validatePlaybook_1.validatePlaybook)(playbook);
    return res.json(report);
});
// POST /pg/match
app.post('/pg/match', (req, res) => {
    const { playbook, actionSignaturesById, evidence } = req.body;
    if (!playbook || !actionSignaturesById || !evidence) {
        return res.status(400).json({ error: 'Missing playbook, actionSignaturesById, or evidence in request body' });
    }
    const hypothesis = (0, matchPlaybook_1.matchPlaybook)({ playbook, actionSignaturesById, evidence });
    return res.json(hypothesis);
});
// GET /pg/fixtures
app.get('/pg/fixtures', (req, res) => {
    return res.json({
        playbook: playbook_defensive_example_json_1.default,
        evidence: evidence_sample_json_1.default
    });
});
function startPGServe(port = 3000) {
    return app.listen(port, () => {
        console.log(`PG Serve listening on port ${port}`);
    });
}
// In case this is run directly
if (require.main === module) {
    startPGServe();
}
