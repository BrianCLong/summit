const express = require('express');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { writeAudit } = require('../utils/audit');

const router = express.Router();
router.use(ensureAuthenticated);

// Validate an import payload and preview the changes without applying
router.post('/validate', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Minimal shape checks (placeholder for schema contracts)
    const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
    const edges = Array.isArray(payload.edges) ? payload.edges : [];
    const problems = [];

    for (const [i, n] of nodes.entries()) {
      if (!n.uuid && !n.id) problems.push({ type: 'node', index: i, issue: 'missing id/uuid' });
      if (!n.type) problems.push({ type: 'node', index: i, issue: 'missing type' });
    }
    for (const [i, e] of edges.entries()) {
      if (!e.source || !e.target) problems.push({ type: 'edge', index: i, issue: 'missing endpoints' });
      if (!e.type) problems.push({ type: 'edge', index: i, issue: 'missing type' });
    }

    const summary = {
      nodes: nodes.length,
      edges: edges.length,
      problems,
      canApply: problems.length === 0,
    };

    await writeAudit({
      userId: req.user?.id,
      actorRole: req.user?.role,
      sessionId: req.sessionId,
      action: 'IMPORT_VALIDATE',
      resourceType: 'Graph',
      resourceId: null,
      details: { counts: { nodes: nodes.length, edges: edges.length } },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ summary });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;

