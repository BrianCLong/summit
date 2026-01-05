import express from 'express';
import fs from 'fs';
import path from 'path';
import { PolicyChangeProposal } from '../policy-engine/proposal-types.js';

const router = express.Router();
const PROPOSALS_DIR = path.join(process.cwd(), '.security/proposals');

// Helper to list proposals
const getProposals = () => {
  if (!fs.existsSync(PROPOSALS_DIR)) return [];
  const dirs = fs.readdirSync(PROPOSALS_DIR);
  const proposals: PolicyChangeProposal[] = [];
  for (const dir of dirs) {
    const jsonPath = path.join(PROPOSALS_DIR, dir, 'proposal.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        proposals.push(data);
      } catch (e) {
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
  const proposalPath = path.join(PROPOSALS_DIR, id, 'proposal.json');
  if (!fs.existsSync(proposalPath)) {
    return res.status(404).json({ error: 'Proposal not found' });
  }
  const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
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

  const proposalPath = path.join(PROPOSALS_DIR, id, 'proposal.json');
  if (!fs.existsSync(proposalPath)) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  try {
    const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));

    // Update status
    proposal.status = decision;
    proposal.decisionMetadata = {
      timestamp: new Date().toISOString(),
      decider: (req as any).user?.id || 'anonymous', // In real app, enforce auth
      comment
    };

    // Save back
    fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2));

    // Log audit event (mocked here, in real app use AuditService)
    console.log(`AUDIT: Proposal ${id} was ${decision} by ${(req as any).user?.id || 'anonymous'}`);

    res.json({ success: true, proposal });
  } catch (error) {
    console.error('Failed to update proposal', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
