
import { Router } from 'express';
import { GovernancePolicyService } from '../services/governance/GovernancePolicyService.js';
import { GovernanceRiskService } from '../services/governance/GovernanceRiskService.js';
import { FiduciaryService } from '../services/governance/FiduciaryService.js';
import { PhilanthropyService } from '../services/governance/PhilanthropyService.js';
import { MissionGuardrailService } from '../services/governance/MissionGuardrailService.js';
import { StewardshipService } from '../services/governance/StewardshipService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

// Policies
router.get('/policies', ensureAuthenticated, (req, res) => {
  const policies = GovernancePolicyService.getInstance().getAllPolicies();
  res.json(policies);
});

router.post('/policies', ensureAuthenticated, (req, res) => {
  // Add RBAC check here for Ethics Council / Board
  const policy = GovernancePolicyService.getInstance().registerPolicy(req.body);
  res.json(policy);
});

// Risk Scoring
router.post('/risk/score', ensureAuthenticated, (req, res) => {
  const result = GovernanceRiskService.getInstance().calculateRisk(req.body);
  res.json(result);
});

// Fiduciary / Cap Table (Simulated)
router.get('/fiduciary/captable', ensureAuthenticated, (req, res) => {
  const capTable = FiduciaryService.getInstance().getCapTable();
  res.json(capTable);
});

router.post('/fiduciary/simulate', ensureAuthenticated, (req, res) => {
  const result = FiduciaryService.getInstance().simulateTransaction(req.body);
  res.json(result);
});

// Philanthropy
router.get('/philanthropy/programs', ensureAuthenticated, (req, res) => {
  const programs = PhilanthropyService.getInstance().getPrograms();
  res.json(programs);
});

router.get('/philanthropy/ledger', ensureAuthenticated, (req, res) => {
  const ledger = PhilanthropyService.getInstance().getLedger();
  res.json(ledger);
});

router.post('/philanthropy/calculate', ensureAuthenticated, (req, res) => {
  const obligation = PhilanthropyService.getInstance().calculateObligation(req.body);
  res.json(obligation);
});

// Mission Guardrails
router.post('/guardrails/check', ensureAuthenticated, (req, res) => {
  const result = MissionGuardrailService.getInstance().checkGuardrails(req.body);
  res.json(result);
});

// Stewardship / Drift
router.get('/stewardship/drift', ensureAuthenticated, (req, res) => {
  const history = StewardshipService.getInstance().getDriftHistory();
  res.json(history);
});

export default router;
