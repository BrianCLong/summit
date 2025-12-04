import { Router } from 'express';
import { schemaCatalog } from '../services/SchemaCatalogService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

/**
 * CI/CD Endpoint: Validate and register a new schema version.
 * Requires authentication (e.g., CI service account).
 */
router.post('/validate', ensureAuthenticated, async (req, res) => {
  try {
    const schema = req.body;

    // Basic structural validation could be done here with Zod, skipping for now
    if (!schema || !schema.version || !schema.entities) {
      res.status(400).json({ error: 'Invalid schema format' });
      return;
    }

    const result = await schemaCatalog.registerSchema(schema);

    if (result.valid) {
      res.status(200).json({
        message: 'Schema validated and registered successfully',
        version: schema.version
      });
    } else {
      res.status(409).json({
        error: 'Schema validation failed',
        details: {
          errors: result.errors,
          breakingChanges: result.breakingChanges
        }
      });
    }

  } catch (error) {
    console.error('Schema validation error', error);
    res.status(500).json({ error: 'Internal server error during schema validation' });
  }
});

export default router;
