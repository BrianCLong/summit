import express from 'express';
import { estimate } from './estimator.js';
import { sandboxRun } from './executor.js';
import { sanitizeCypher } from './sanitizer.js';
import { translate } from './translator.js';
import { validateCypher } from './validator.js';
import { diffQueries } from './diff.js';

export const router = express.Router();

router.post('/translate', (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const translation = translate(prompt);
  const sanitized = sanitizeCypher(translation.cypher);
  const diff = diffQueries(translation.cypher, sanitized.cleaned);
  const { valid, warnings } = validateCypher(sanitized.cleaned);

  const response = {
    cypher: sanitized.cleaned,
    sqlFallback: translation.sqlFallback,
    confidence: translation.confidence,
    warnings: [...translation.warnings, ...sanitized.warnings, ...warnings],
    diff,
  };

  console.info('[nl-cypher] translate trace', translation.reasoningTrace.join(' | '));
  res.json(response);
});

router.post('/estimate', (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const result = estimate(prompt);
  res.json(result);
});

router.post('/sandbox/run', (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const result = sandboxRun(prompt);
  res.json(result);
});

export default router;
