import crypto from 'node:crypto';
import { listRecipes, loadRecipe } from '../../recipes/loader.js';

export const recipeResolvers = {
  Query: {
    recipes: async () => await listRecipes(),
    recipe: async (_: any, { name }: { name: string }) =>
      await loadRecipe(name),
  },
  Mutation: {
    startRecipe: async (
      _: any,
      { input }: { input: { name: string; inputs?: any } },
      _ctx: any,
    ) => {
      const runId = `recipe-${Date.now()}`;
      const auditId = `audit-${Date.now()}`;
      return { runId, auditId, status: 'QUEUED', name: input.name };
    },
    runRecipe: async (
      _: any,
      { name, inputs, meta }: { name: string; inputs: any; meta: any },
      _ctx: any,
    ) => {
      const plan = await loadRecipe(name);
      return {
        status: meta?.dryRun ? 'PLANNED' : 'QUEUED',
        warnings: [],
        diff: { plan, inputs },
        auditId: crypto.randomUUID(),
      };
    },
  },
};
