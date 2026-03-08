"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const loader_js_1 = require("../recipes/loader.js");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const recipesDir = path_1.default.resolve(process.cwd(), 'recipes');
router.get('/recipes', (_req, res) => {
    try {
        const files = fs_1.default.existsSync(recipesDir) ? fs_1.default.readdirSync(recipesDir) : [];
        const items = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
        res.json({ items });
    }
    catch (e) {
        res.status(500).json({ error: 'failed to list recipes' });
    }
});
// REST wrapper for GraphQL startRecipe mutation - maintains API compatibility
router.post('/recipes/run', express_1.default.json(), async (req, res) => {
    try {
        const { name, inputs } = req.body || {};
        if (!name)
            return res.status(400).json({ error: 'name required' });
        // Use the same validation logic as GraphQL resolver
        const recipeFiles = [
            `${name}.yaml`,
            `${name}.yml`,
            name.endsWith('.yaml') || name.endsWith('.yml') ? name : null,
        ].filter(Boolean);
        let validRecipeFile = null;
        const recipesRoot = path_1.default.resolve(process.cwd(), 'recipes');
        for (const file of recipeFiles) {
            // SECURITY: Prevent path traversal
            const fullPath = path_1.default.resolve(recipesRoot, file);
            // Ensure the resolved path is still inside the recipes directory
            // Using path.relative checks for sibling directory attacks better than startsWith
            const rel = path_1.default.relative(recipesRoot, fullPath);
            if (rel.startsWith('..') || path_1.default.isAbsolute(rel)) {
                console.warn(`[SECURITY] Blocked path traversal attempt: ${file}`);
                continue;
            }
            if (fs_1.default.existsSync(fullPath)) {
                validRecipeFile = file;
                break;
            }
        }
        if (!validRecipeFile) {
            const availableRecipes = fs_1.default
                .readdirSync(path_1.default.join(process.cwd(), 'recipes'))
                .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
                .join(', ');
            return res.status(404).json({
                error: `Recipe '${name}' not found. Available recipes: ${availableRecipes}`,
            });
        }
        // Load and validate recipe
        let recipe;
        try {
            recipe = await (0, loader_js_1.loadRecipe)(validRecipeFile);
            if (recipe.__error) {
                return res
                    .status(400)
                    .json({ error: `Recipe loading error: ${recipe.__error}` });
            }
        }
        catch (error) {
            return res
                .status(400)
                .json({ error: `Failed to load recipe '${name}': ${error.message}` });
        }
        // Validate inputs if recipe defines input schema
        const validatedInputs = inputs || {};
        if (recipe.inputs && typeof recipe.inputs === 'object') {
            for (const [key, spec] of Object.entries(recipe.inputs)) {
                const inputSpec = spec;
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
        const runId = `recipe-run-${crypto_1.default.randomUUID()}`;
        const auditId = `audit-${crypto_1.default.randomUUID()}`;
        // TODO: Enqueue job with your actual job queue (BullMQ, etc.)
        // For now, we'll simulate enqueueing
        console.log(`Enqueuing recipe execution: ${validRecipeFile} with inputs:`, validatedInputs);
        // Create audit trail
        const userId = req.user?.id || 'anonymous';
        console.log(`Audit ${auditId}: Recipe ${validRecipeFile} started by ${userId} with run ${runId}`);
        return res.json({
            status: 'QUEUED',
            runId,
            auditId,
            recipe: validRecipeFile,
            inputs: validatedInputs,
        });
    }
    catch (e) {
        console.error('Recipe execution error:', e);
        res.status(500).json({ error: 'failed to run recipe' });
    }
});
exports.default = router;
