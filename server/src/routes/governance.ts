
import express, { Response } from 'express';
import { SchemaRegistryService } from '../governance/ontology/SchemaRegistryService';
import { WorkflowService } from '../governance/ontology/WorkflowService';
import { ensureAuthenticated } from '../middleware/auth';
import type { AuthenticatedRequest } from './types.js';

const router = express.Router();
const registry = SchemaRegistryService.getInstance();
const workflow = WorkflowService.getInstance();

// Schema Routes
router.get('/schemas', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
  res.json(registry.listSchemas());
});

router.get('/schemas/latest', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
  const schema = registry.getLatestSchema();
  if (!schema) return res.status(404).json({ error: 'No active schema' });
  res.json(schema);
});

router.get('/schemas/:id', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
  const schema = registry.getSchemaById(req.params.id);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });
  res.json(schema);
});

// Vocabulary Routes
router.get('/vocabularies', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
  res.json(registry.listVocabularies());
});

router.post('/vocabularies', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    try {
        // Permission check: Only schema.admin can create vocabularies
        const userRoles = req.user?.role?.split(',') || [];
        const hasSchemaAdminPermission = userRoles.includes('schema.admin') ||
                                          userRoles.includes('admin') ||
                                          req.user?.permissions?.includes('schema.admin');

        if (!hasSchemaAdminPermission) {
            return res.status(403).json({
                error: 'Forbidden: schema.admin permission required to create vocabularies'
            });
        }

        const { name, description, concepts } = req.body;
        const vocab = registry.createVocabulary(name, description, concepts);
        res.status(201).json(vocab);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Change Request Routes
router.get('/changes', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    res.json(workflow.listChangeRequests());
});

router.post('/changes', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    try {
        const { title, description, proposedChanges } = req.body;
        const author = req.user?.id || 'unknown';
        const cr = workflow.createChangeRequest(title, description, author, proposedChanges);
        res.status(201).json(cr);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/changes/:id', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    const cr = workflow.getChangeRequest(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change Request not found' });
    res.json(cr);
});

router.get('/changes/:id/impact', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    // Determine impact
    const impact = workflow.calculateImpact(req.params.id);
    res.json(impact);
});

router.post('/changes/:id/review', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    try {
        const { decision, comment } = req.body;
        const reviewer = req.user?.id || 'unknown';
        const cr = workflow.reviewChangeRequest(req.params.id, reviewer, decision, comment);
        res.json(cr);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/changes/:id/merge', ensureAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    try {
        const merger = req.user?.id || 'unknown';
        const newSchema = workflow.mergeChangeRequest(req.params.id, merger);
        res.json(newSchema);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});


export default router;
