"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiPlanSchema = exports.ConstraintsSchema = exports.LayoutSchema = exports.PageSchema = exports.SectionSchema = exports.PanelSchema = exports.CitationSchema = exports.ActionSchema = exports.DataRequestSchema = exports.DataRequestTypeSchema = exports.ComponentKindSchema = exports.IntentSchema = void 0;
exports.validatePlan = validatePlan;
const zod_1 = require("zod");
exports.IntentSchema = zod_1.z.enum([
    'investigate',
    'compare',
    'plan',
    'remediate',
    'onboard',
    'triage',
]);
exports.ComponentKindSchema = zod_1.z.enum([
    'kpi',
    'table',
    'timeline',
    'graphView',
    'checklist',
    'diff',
    'callout',
    'form',
    'stepper',
    'citationList',
]);
exports.DataRequestTypeSchema = zod_1.z.enum([
    'graphql',
    'sql',
    'cypher',
    'search',
    'rest',
]);
exports.DataRequestSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    type: exports.DataRequestTypeSchema,
    query: zod_1.z.string().min(1),
    params: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    description: zod_1.z.string().optional(),
});
exports.ActionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    tool: zod_1.z.string().min(1),
    input: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    requiresConfirmation: zod_1.z.boolean().default(false),
    description: zod_1.z.string().optional(),
});
exports.CitationSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    source: zod_1.z.string().min(1),
    url: zod_1.z.string().url().optional(),
    evidenceId: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
exports.PanelSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    component: exports.ComponentKindSchema,
    props: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    dataRequestIds: zod_1.z.array(zod_1.z.string()).default([]),
    actionIds: zod_1.z.array(zod_1.z.string()).default([]),
    citationIds: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.SectionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    panels: zod_1.z.array(exports.PanelSchema).min(1),
});
exports.PageSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    sections: zod_1.z.array(exports.SectionSchema).min(1),
});
exports.LayoutSchema = zod_1.z.object({
    pages: zod_1.z.array(exports.PageSchema).min(1),
});
exports.ConstraintsSchema = zod_1.z.object({
    theme: zod_1.z.string().optional(),
    accessibility: zod_1.z.object({
        minContrastRatio: zod_1.z.number().min(1).optional(),
        requiresKeyboardNav: zod_1.z.boolean().default(true),
        prefersReducedMotion: zod_1.z.boolean().default(false),
    }),
    tenantPolicies: zod_1.z.array(zod_1.z.string()).default([]),
    networkPolicy: zod_1.z.enum(['no-external', 'allowlisted']).default('no-external'),
});
exports.UiPlanSchema = zod_1.z.object({
    version: zod_1.z.string().min(1),
    intent: exports.IntentSchema,
    layout: exports.LayoutSchema,
    dataRequests: zod_1.z.array(exports.DataRequestSchema).default([]),
    actions: zod_1.z.array(exports.ActionSchema).default([]),
    citations: zod_1.z.array(exports.CitationSchema).default([]),
    constraints: exports.ConstraintsSchema,
});
function validatePlan(plan) {
    return exports.UiPlanSchema.parse(plan);
}
