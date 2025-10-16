import express from 'express';
import fs from 'fs';
import path from 'path';
import { loadRecipe } from '../recipes/loader.js';
import { isEnabled as flagEnabled } from '../featureFlags/flagsmith.js';
import crypto from 'crypto';

const router = express.Router();
const recipesDir = path.resolve(process.cwd(), 'recipes');

router.get('/recipes', (_req, res) => {
  try {
    const files = fs.existsSync(recipesDir) ? fs.readdirSync(recipesDir) : [];
    const items = files.filter(
      (f) => f.endsWith('.yaml') || f.endsWith('.yml'),
    );
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'failed to list recipes' });
  }
});

// REST wrapper for GraphQL startRecipe mutation - maintains API compatibility
router.post('/recipes/run', express.json(), async (req, res) => {
  try {
    const { name, inputs } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });

    // Use the same validation logic as GraphQL resolver
    const recipeFiles = [
      `${name}.yaml`,
      `${name}.yml`,
      name.endsWith('.yaml') || name.endsWith('.yml') ? name : null,
    ].filter(Boolean);

    let validRecipeFile = null;
    for (const file of recipeFiles) {
      const fullPath = path.join(process.cwd(), 'recipes', file);
      if (fs.existsSync(fullPath)) {
        validRecipeFile = file;
        break;
      }
    }

    if (!validRecipeFile) {
      const availableRecipes = fs
        .readdirSync(path.join(process.cwd(), 'recipes'))
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
        .join(', ');
      return res.status(404).json({
        error: `Recipe '${name}' not found. Available recipes: ${availableRecipes}`,
      });
    }

    // Load and validate recipe
    let recipe;
    try {
      recipe = await loadRecipe(validRecipeFile);
      if (recipe.__error) {
        return res
          .status(400)
          .json({ error: `Recipe loading error: ${recipe.__error}` });
      }
    } catch (error) {
      return res
        .status(400)
        .json({ error: `Failed to load recipe '${name}': ${error.message}` });
    }

    // Validate inputs if recipe defines input schema
    const validatedInputs = inputs || {};
    if (recipe.inputs && typeof recipe.inputs === 'object') {
      for (const [key, spec] of Object.entries(recipe.inputs)) {
        const inputSpec = spec as any;
        if (inputSpec.required && !(key in validatedInputs)) {
          return res
            .status(400)
            .json({ error: `Required input '${key}' is missing` });
        }
      }
    }

    // Check budget plugin requirement
    const requiresBudget = process.env.REQUIRE_BUDGET_PLUGIN === 'true';
    if (requiresBudget && !req.budget) {
      return res
        .status(402)
        .json({ error: 'Budget plugin is required but not available' });
    }

    // Generate unique IDs
    const runId = `recipe-run-${crypto.randomUUID()}`;
    const auditId = `audit-${crypto.randomUUID()}`;

    // TODO: Enqueue job with your actual job queue (BullMQ, etc.)
    // For now, we'll simulate enqueueing
    console.log(
      `Enqueuing recipe execution: ${validRecipeFile} with inputs:`,
      validatedInputs,
    );

    // Create audit trail
    const userId = req.user?.id || 'anonymous';
    console.log(
      `Audit ${auditId}: Recipe ${validRecipeFile} started by ${userId} with run ${runId}`,
    );

    return res.json({
      status: 'QUEUED',
      runId,
      auditId,
      recipe: validRecipeFile,
      inputs: validatedInputs,
    });
  } catch (e) {
    console.error('Recipe execution error:', e);
    res.status(500).json({ error: 'failed to run recipe' });
  }
});

export default router;
