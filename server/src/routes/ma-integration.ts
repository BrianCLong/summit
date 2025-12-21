import express from 'express';
import { maIntegrationPlaybook } from '../services/integration/maIntegrationPlaybook.js';

const router = express.Router();

router.get('/playbook', (_req, res) => {
  res.json({
    tasks: maIntegrationPlaybook.listTasks(),
    successMetrics: maIntegrationPlaybook.getSuccessMetrics(),
    synergies: maIntegrationPlaybook.getSynergyHypotheses(),
    governance: maIntegrationPlaybook.getGovernance(),
  });
});

router.post('/evaluate', (req, res) => {
  const { state, signal, successActuals = {}, synergyActuals = {} } = req.body || {};

  const requiredSignalFields = [
    'securityIncidentOpen',
    'uptime',
    'churnRate',
    'customerEscalations',
    'drTestHoursSince',
    'errorBudgetConsumed',
    'churnBaseline',
    'financeControlFailure',
  ];

  if (!state || !signal) {
    return res.status(400).json({ error: 'state and signal payloads are required' });
  }

  if (requiredSignalFields.some((field) => !(field in signal))) {
    return res.status(400).json({ error: 'signal payload missing required fields' });
  }

  const redLines = maIntegrationPlaybook.evaluateRedLines(state);
  const stopLines = maIntegrationPlaybook.evaluateStopLines(signal);
  const success = maIntegrationPlaybook.evaluateSuccessMetrics(successActuals);
  const synergies = maIntegrationPlaybook.evaluateSynergies(synergyActuals);

  res.json({ redLines, stopLines, success, synergies });
});

router.post('/exceptions', (req, res) => {
  const { reason, owner, expiresAt, scope, deviation, risk, mitigation, reviewCadenceDays } = req.body || {};
  if (!reason || !owner || !expiresAt || !scope || !deviation || !risk || !mitigation || !reviewCadenceDays) {
    return res.status(400).json({ error: 'reason, owner, scope, deviation, risk, mitigation, reviewCadenceDays, and expiresAt are required' });
  }

  try {
    const record = maIntegrationPlaybook.registerException({
      reason,
      owner,
      expiresAt,
      scope,
      deviation,
      risk,
      mitigation,
      reviewCadenceDays,
    });
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/tabletop', (req, res) => {
  const inputs = req.body;
  if (!inputs?.scenario) {
    return res.status(400).json({ error: 'scenario is required for tabletop simulation' });
  }

  try {
    const report = maIntegrationPlaybook.runTabletop(inputs);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/exceptions', (_req, res) => {
  res.json(maIntegrationPlaybook.listExceptions());
});

export default router;
