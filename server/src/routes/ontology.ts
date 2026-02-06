
import { Router, Request, Response } from 'express';
import { OntologyExecutionService } from '../governance/ontology/OntologyExecutionService.js';
import { SchemaRegistryService } from '../governance/ontology/SchemaRegistryService.js';
import { opaClient } from '../services/opa-client.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { OntologyAssertion } from '../governance/ontology/models.js';

const router = Router();
const executionService = OntologyExecutionService.getInstance();
const registryService = SchemaRegistryService.getInstance();
const singleParam = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value[0] : value ?? '';

// Validate
router.post('/validate', asyncHandler(async (req: Request, res: Response) => {
    const { entityType, data } = req.body;
    if (!entityType || !data) {
        return res.status(400).json({ error: 'Missing entityType or data' });
    }
    const result = await executionService.validate(entityType, data);
    res.json(result);
}));

// Infer
router.post('/infer', asyncHandler(async (req: Request, res: Response) => {
    const { assertions } = req.body;
    if (!assertions || !Array.isArray(assertions)) {
        return res.status(400).json({ error: 'Missing assertions array' });
    }
    const result = await executionService.infer(assertions as OntologyAssertion[]);
    res.json(result);
}));

// Explain
router.post('/explain', asyncHandler(async (req: Request, res: Response) => {
    const { assertion } = req.body;
    if (!assertion) {
        return res.status(400).json({ error: 'Missing assertion' });
    }
    const result = await executionService.explain(assertion as OntologyAssertion);
    res.json({ explanation: result });
}));


// Get Active Schema
router.get('/schema', asyncHandler(async (req: Request, res: Response) => {
    const schema = registryService.getLatestSchema();
    if (!schema) {
        // Try to ensure initialized if first run
        await registryService.ensureInitialized();
        const retry = registryService.getLatestSchema();
        if (!retry) return res.status(404).json({ error: 'No active schema found' });
        return res.json(retry);
    }
    res.json(schema);
}));

// Get specific schema
router.get('/schema/:version', asyncHandler(async (req: Request, res: Response) => {
    const version = singleParam(req.params.version);
    const schema = registryService.getSchema(version);
    if (!schema) {
        return res.status(404).json({ error: 'Schema version not found' });
    }
    res.json(schema);
}));

// Create Schema (Draft) - Protected by OPA
router.post('/schema', asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // OPA Check
    const opaInput = {
        user: {
            id: user.id,
            roles: user.roles || []
        },
        action: 'create_draft',
        resource: { type: 'schema' }
    };

    try {
        const allowed = await opaClient.evaluateQuery('ontology/allow', opaInput);
        if (allowed !== true) {
            return res.status(403).json({ error: 'Policy denied schema creation' });
        }
    } catch (e: any) {
         console.error('OPA check failed', e);
         // Fail closed
         return res.status(500).json({ error: 'Policy check failed' });
    }

    const { definition, changelog } = req.body;
    const schema = await registryService.registerSchema(definition, changelog, user.id);
    res.status(201).json(schema);
}));

// Approve Schema - Protected by OPA
router.post('/schema/:id/approve', asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const schemaId = singleParam(req.params.id);
    const schema = registryService.getSchemaById(schemaId);

    if (!schema) {
        return res.status(404).json({ error: 'Schema not found' });
    }

    const opaInput = {
        user: {
            id: user.id,
            roles: user.roles || []
        },
        action: 'approve_schema',
        resource: {
            type: 'schema',
            status: schema.status,
            version: schema.version,
            previousVersion: '0.0.0',
            hasBreakingChanges: false
        }
    };

    try {
        const allowed = await opaClient.evaluateQuery('ontology/allow', opaInput);
        if (allowed !== true) {
            return res.status(403).json({ error: 'Policy denied schema approval' });
        }
    } catch (e: any) {
         console.error('OPA check failed', e);
         // Fail closed
         return res.status(500).json({ error: 'Policy check failed' });
    }

    await registryService.activateSchema(schemaId, user.id);
    res.json({ status: 'approved', schemaId });
}));

export default router;
