
import { Router } from 'express';
import { RedactionEngine } from '../redaction/RedactionEngine';
import { RedactionRule } from '../redaction/types';

const router = Router();

// Default ruleset (could be loaded from DB)
const defaultRules: RedactionRule[] = [
    {
        id: 'email-rule',
        description: 'Redact email addresses',
        type: 'pii_category',
        category: 'EMAIL',
        replacement: '[REDACTED_EMAIL]'
    },
    {
        id: 'phone-rule',
        description: 'Redact phone numbers',
        type: 'pii_category',
        category: 'PHONE',
        replacement: '[REDACTED_PHONE]'
    },
    {
        id: 'secret-rule',
        description: 'Redact project codenames',
        type: 'regex',
        pattern: /(AURORA|ORACLE|NECROMANCER)/i,
        replacement: '[REDACTED_CODENAME]'
    }
];

const engine = new RedactionEngine(defaultRules);

router.post('/apply', (req, res) => {
    try {
        const { text, rulesetId } = req.body;
        if (!text) {
             return res.status(400).json({ error: 'Text is required' });
        }

        // In a real system, look up rulesetId. Here we use default.
        const result = engine.apply(text);

        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
