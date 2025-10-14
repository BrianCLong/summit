const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const OPA_URL = process.env.OPA_URL || 'http://localhost:8181';

// Preview export policy outcome
router.post('/export/policy-check', async (req, res) => {
  try {
    const { format, includeProvenance, stepUpToken } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Call OPA to evaluate export policy
    const opaResponse = await fetch(`${OPA_URL}/v1/data/export/allow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          user: userId,
          action: 'export',
          resource: {
            format,
            includeProvenance
          },
          stepUpToken,
          timestamp: new Date().toISOString()
        }
      })
    });

    const opaResult = await opaResponse.json();

    if (opaResult.result?.allow) {
      res.json({
        outcome: {
          decision: 'allow',
          reason: 'Export allowed by policy',
          rule_id: 'export.allow'
        },
        requiresStepUp: false
      });
    } else {
      const requiresStepUp = opaResult.result?.stepup_required || false;

      res.json({
        outcome: {
          decision: 'deny',
          reason: opaResult.result?.reason || 'Export denied by policy',
          rule_id: opaResult.result?.rule_id || 'export.deny',
          evidence: opaResult.result?.evidence || [],
          remediation: requiresStepUp
            ? 'Complete step-up authentication to proceed with this export'
            : 'Contact your administrator for export permissions'
        },
        requiresStepUp
      });
    }
  } catch (error) {
    console.error('Policy check error:', error);
    res.status(500).json({
      outcome: {
        decision: 'deny',
        reason: 'Error evaluating policy: ' + error.message,
        rule_id: 'error'
      },
      requiresStepUp: false
    });
  }
});

// Preview query export policy
router.post('/preview-export', async (req, res) => {
  try {
    const { query, action, stepUpToken } = req.body;
    const userId = req.user?.id || 'anonymous';

    const opaResponse = await fetch(`${OPA_URL}/v1/data/query/export_preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          user: userId,
          action,
          query,
          stepUpToken,
          timestamp: new Date().toISOString()
        }
      })
    });

    const opaResult = await opaResponse.json();

    res.json({
      allowed: opaResult.result?.allow || false,
      reason: opaResult.result?.reason || 'Policy evaluation result',
      requiredStepUp: opaResult.result?.stepup_required || false,
      dlpViolations: opaResult.result?.dlp_violations || []
    });
  } catch (error) {
    console.error('Preview policy error:', error);
    res.status(500).json({
      allowed: false,
      reason: 'Error previewing policy: ' + error.message,
      requiredStepUp: false
    });
  }
});

// Generate AI explanation for policy outcome
router.post('/explain', async (req, res) => {
  try {
    const { outcome, context } = req.body;

    // Simple rule-based explanation (can be enhanced with LLM)
    let explanation = '';

    if (outcome.decision === 'deny') {
      if (outcome.rule_id.includes('dlp')) {
        explanation = `This action was blocked because sensitive data patterns were detected. DLP (Data Loss Prevention) policies prevent export of data containing: ${outcome.evidence?.join(', ') || 'classified information'}.`;
      } else if (outcome.rule_id.includes('stepup')) {
        explanation = `This action requires additional authentication because it accesses high-value or sensitive resources. Step-up authentication provides an extra layer of security for risky operations.`;
      } else if (outcome.rule_id.includes('classification')) {
        explanation = `Access denied due to data classification restrictions. Your current clearance level does not permit access to this classification tier.`;
      } else {
        explanation = `This action was blocked by policy rule '${outcome.rule_id}'. ${outcome.reason}`;
      }

      if (outcome.remediation) {
        explanation += `\n\nTo proceed: ${outcome.remediation}`;
      }
    } else {
      explanation = `This action is allowed. Policy evaluation passed all required checks: ${outcome.evidence?.join(', ') || 'all criteria met'}.`;
    }

    res.json({ explanation });
  } catch (error) {
    console.error('Explanation error:', error);
    res.status(500).json({
      explanation: 'Unable to generate explanation: ' + error.message
    });
  }
});

module.exports = router;
