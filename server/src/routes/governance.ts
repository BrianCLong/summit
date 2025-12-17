
import express from 'express';
import { SchemaRegistryService } from '../governance/ontology/SchemaRegistryService';
import { WorkflowService } from '../governance/ontology/WorkflowService';
import { ensureAuthenticated } from '../middleware/auth';

const router = express.Router();
const registry = SchemaRegistryService.getInstance();
const workflow = WorkflowService.getInstance();

// Schema Routes
router.get('/schemas', ensureAuthenticated, (req, res) => {
  res.json(registry.listSchemas());
});

router.get('/schemas/latest', ensureAuthenticated, (req, res) => {
  const schema = registry.getLatestSchema();
  if (!schema) return res.status(404).json({ error: 'No active schema' });
  res.json(schema);
});

router.get('/schemas/:id', ensureAuthenticated, (req, res) => {
  const schema = registry.getSchemaById(req.params.id);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });
  res.json(schema);
});

// Vocabulary Routes
router.get('/vocabularies', ensureAuthenticated, (req, res) => {
  res.json(registry.listVocabularies());
});

router.post('/vocabularies', ensureAuthenticated, (req, res) => {
    // TODO: Add permission check (schema.admin)
    try {
        const { name, description, concepts } = req.body;
        const vocab = registry.createVocabulary(name, description, concepts);
        res.status(201).json(vocab);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Change Request Routes
router.get('/changes', ensureAuthenticated, (req, res) => {
    res.json(workflow.listChangeRequests());
});

router.post('/changes', ensureAuthenticated, (req, res) => {
    try {
        const { title, description, proposedChanges } = req.body;
        // @ts-ignore - req.user is added by ensureAuthenticated
        const author = req.user?.id || 'unknown';
        const cr = workflow.createChangeRequest(title, description, author, proposedChanges);
        res.status(201).json(cr);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/changes/:id', ensureAuthenticated, (req, res) => {
    const cr = workflow.getChangeRequest(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change Request not found' });
    res.json(cr);
});

router.get('/changes/:id/impact', ensureAuthenticated, (req, res) => {
    // Determine impact
    const impact = workflow.calculateImpact(req.params.id);
    res.json(impact);
});

router.post('/changes/:id/review', ensureAuthenticated, (req, res) => {
    try {
        const { decision, comment } = req.body;
        // @ts-ignore
        const reviewer = req.user?.id || 'unknown';
        const cr = workflow.reviewChangeRequest(req.params.id, reviewer, decision, comment);
        res.json(cr);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/changes/:id/merge', ensureAuthenticated, (req, res) => {
    try {
        // @ts-ignore
        const merger = req.user?.id || 'unknown';
        const newSchema = workflow.mergeChangeRequest(req.params.id, merger);
        res.json(newSchema);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});


export default router;
