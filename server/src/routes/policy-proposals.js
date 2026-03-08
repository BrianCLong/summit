"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const PROPOSALS_DIR = path_1.default.join(process.cwd(), '.security/proposals');
// Helper to list proposals
const getProposals = () => {
    if (!fs_1.default.existsSync(PROPOSALS_DIR))
        return [];
    const dirs = fs_1.default.readdirSync(PROPOSALS_DIR);
    const proposals = [];
    for (const dir of dirs) {
        const jsonPath = path_1.default.join(PROPOSALS_DIR, dir, 'proposal.json');
        if (fs_1.default.existsSync(jsonPath)) {
            try {
                const data = JSON.parse(fs_1.default.readFileSync(jsonPath, 'utf8'));
                proposals.push(data);
            }
            catch (e) {
                console.error(`Failed to parse proposal ${dir}`, e);
            }
        }
    }
    return proposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
// GET /api/policy-proposals
router.get('/', (req, res) => {
    const proposals = getProposals();
    res.json({ proposals });
});
// GET /api/policy-proposals/:id
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const proposalPath = path_1.default.join(PROPOSALS_DIR, id, 'proposal.json');
    if (!fs_1.default.existsSync(proposalPath)) {
        return res.status(404).json({ error: 'Proposal not found' });
    }
    const proposal = JSON.parse(fs_1.default.readFileSync(proposalPath, 'utf8'));
    res.json({ proposal });
});
// POST /api/policy-proposals/:id/decision
// Body: { decision: 'approved' | 'rejected', comment: string }
router.post('/:id/decision', (req, res) => {
    const { id } = req.params;
    const { decision, comment } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ error: 'Invalid decision. Must be approved or rejected.' });
    }
    const proposalPath = path_1.default.join(PROPOSALS_DIR, id, 'proposal.json');
    if (!fs_1.default.existsSync(proposalPath)) {
        return res.status(404).json({ error: 'Proposal not found' });
    }
    try {
        const proposal = JSON.parse(fs_1.default.readFileSync(proposalPath, 'utf8'));
        // Update status
        proposal.status = decision;
        proposal.decisionMetadata = {
            timestamp: new Date().toISOString(),
            decider: req.user?.id || 'anonymous', // In real app, enforce auth
            comment
        };
        // Save back
        fs_1.default.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2));
        // Log audit event (mocked here, in real app use AuditService)
        console.log(`AUDIT: Proposal ${id} was ${decision} by ${req.user?.id || 'anonymous'}`);
        res.json({ success: true, proposal });
    }
    catch (error) {
        console.error('Failed to update proposal', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
