"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipeResolvers = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const loader_js_1 = require("../../recipes/loader.js");
exports.recipeResolvers = {
    Query: {
        recipes: async () => await (0, loader_js_1.listRecipes)(),
        recipe: async (_, { name }) => await (0, loader_js_1.loadRecipe)(name),
    },
    Mutation: {
        startRecipe: async (_, { input }, _ctx) => {
            const runId = `recipe-${Date.now()}`;
            const auditId = `audit-${Date.now()}`;
            return { runId, auditId, status: 'QUEUED', name: input.name };
        },
        runRecipe: async (_, { name, inputs, meta }, _ctx) => {
            const plan = await (0, loader_js_1.loadRecipe)(name);
            return {
                status: meta?.dryRun ? 'PLANNED' : 'QUEUED',
                warnings: [],
                diff: { plan, inputs },
                auditId: node_crypto_1.default.randomUUID(),
            };
        },
    },
};
