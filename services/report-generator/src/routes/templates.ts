/**
 * Template management API routes
 */

import { Router } from 'express';
import { TemplateManager } from '@summit/templates';
import { TemplateStorage } from '@summit/templates';

const router = Router();

// Initialize services
const templateManager = new TemplateManager('handlebars');
const templateStorage = new TemplateStorage();

/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', (req, res) => {
  try {
    const template = templateManager.createTemplate(req.body);

    // Save initial version
    templateStorage.saveVersion(template, 'Initial version', req.body.createdBy);

    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/templates
 * List templates
 */
router.get('/', (req, res) => {
  try {
    const filters = {
      category: req.query.category as string,
      format: req.query.format as string,
      isPublic: req.query.isPublic === 'true' ? true : undefined
    };

    const templates = templateManager.listTemplates(filters);

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get('/:id', (req, res) => {
  try {
    const template = templateManager.getTemplate(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update template
 */
router.put('/:id', (req, res) => {
  try {
    const updated = templateManager.updateTemplate(req.params.id, req.body);

    // Save version
    if (req.body.changes) {
      templateStorage.saveVersion(updated, req.body.changes, req.body.updatedBy);
    }

    res.json({
      success: true,
      template: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete template
 */
router.delete('/:id', (req, res) => {
  try {
    const deleted = templateManager.deleteTemplate(req.params.id);

    res.json({
      success: true,
      deleted
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/templates/:id/clone
 * Clone template
 */
router.post('/:id/clone', (req, res) => {
  try {
    const { newName, userId } = req.body;
    const cloned = templateManager.cloneTemplate(req.params.id, newName, userId);

    res.json({
      success: true,
      template: cloned
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/templates/:id/versions
 * Get template version history
 */
router.get('/:id/versions', (req, res) => {
  try {
    const history = templateStorage.getVersionHistory(req.params.id);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/templates/search
 * Search templates
 */
router.get('/search/:query', (req, res) => {
  try {
    const results = templateManager.searchTemplates(req.params.query);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as templateRoutes };
