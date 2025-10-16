import express from 'express';
import { nl2cypher } from '../nl2cypher/index';
import { executeSandbox } from '../nl2cypher/sandbox';
import { diffLines } from 'diff';
import { trace } from '@opentelemetry/api';
const router = express.Router();
const tracer = trace.getTracer('nl2cypher');
router.post('/nl2cypher', async (req, res) => {
    await tracer.startActiveSpan('nl2cypher', async (span) => {
        try {
            const { prompt } = req.body;
            const { cypher, ast, rationale, estimatedCost } = nl2cypher(prompt);
            res.json({ cypher, ast, rationale, estimatedCost });
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
        finally {
            span.end();
        }
    });
});
router.post('/nl2cypher/diff', (req, res) => {
    const { original, edited } = req.body;
    const diff = diffLines(original || '', edited || '');
    res.json({ diff });
});
router.post('/sandbox/execute', async (req, res) => {
    await tracer.startActiveSpan('sandbox', async (span) => {
        try {
            const { cypher } = req.body;
            if (!cypher || typeof cypher !== 'string') {
                return res.status(400).json({ error: 'cypher is required' });
            }
            // Hardening: forbid dangerous patterns
            const banned = [
                /\bCREATE\b/i,
                /\bMERGE\b/i,
                /\bDELETE\b/i,
                /\bSET\b/i,
                /\bDROP\b/i,
                /\bCALL\b\s+apoc\./i,
                /\bLOAD\s+CSV\b/i,
                /\bPERIODIC\s+COMMIT\b/i,
                /\bREMOVE\b/i,
            ];
            if (banned.some((r) => r.test(cypher))) {
                return res
                    .status(400)
                    .json({ error: 'Query contains forbidden operations in sandbox' });
            }
            // Enforce LIMIT if missing when returning rows
            let safe = cypher;
            if (/\bRETURN\b/i.test(cypher) && !/\bLIMIT\b/i.test(cypher)) {
                safe = cypher.trim().replace(/;?\s*$/, ' LIMIT 200');
            }
            const rows = await executeSandbox(safe);
            res.json({ rows, enforcedLimit: safe !== cypher });
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
        finally {
            span.end();
        }
    });
});
export default router;
//# sourceMappingURL=nl2cypher.js.map