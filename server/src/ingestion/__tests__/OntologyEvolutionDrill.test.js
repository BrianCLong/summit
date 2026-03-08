"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ontology_evolution_service_js_1 = require("../ontology-evolution-service.js");
(0, globals_1.describe)('Ontology Evolution Drill (Task #112)', () => {
    (0, globals_1.it)('should identify high-frequency custom attributes', async () => {
        const suggestions = await ontology_evolution_service_js_1.ontologyEvolutionService.analyzeDrift();
        (0, globals_1.expect)(suggestions).toHaveLength(2);
        (0, globals_1.expect)(suggestions[0].field).toBe('linkedin_url');
        (0, globals_1.expect)(suggestions[0].frequency).toBeGreaterThan(0.8);
    });
    (0, globals_1.it)('should auto-apply promotions with very high confidence', async () => {
        const safePromotion = {
            entityType: 'Person',
            field: 'safe_field',
            frequency: 0.95,
            reason: 'Ubiquitous usage',
            suggestedType: 'string'
        };
        const applied = await ontology_evolution_service_js_1.ontologyEvolutionService.applyPromotion(safePromotion);
        (0, globals_1.expect)(applied).toBe(true);
    });
    (0, globals_1.it)('should require review for lower confidence promotions', async () => {
        const riskyPromotion = {
            entityType: 'Event',
            field: 'maybe_field',
            frequency: 0.60,
            reason: 'Emerging',
            suggestedType: 'string'
        };
        const applied = await ontology_evolution_service_js_1.ontologyEvolutionService.applyPromotion(riskyPromotion);
        (0, globals_1.expect)(applied).toBe(false);
    });
});
