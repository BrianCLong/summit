"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uncertaintyResolvers = void 0;
/**
 * GraphQL resolvers for Uncertainty Field Mapping
 */
exports.uncertaintyResolvers = {
    Query: {
        /**
         * Get uncertainty field for an investigation
         */
        getUncertaintyField: async (_parent, args, context) => {
            const field = await context.mapper.getFieldByInvestigation(args.investigationId);
            if (!field && args.config) {
                // If field doesn't exist and config provided, generate it
                // In production, this would fetch predictions from the prediction service
                const mockPredictions = generateMockPredictions(args.investigationId);
                return await context.mapper.generateField(args.investigationId, mockPredictions, args.config.dimensions, args.config.resolution);
            }
            return field;
        },
        /**
         * Get 2D/3D surface representation
         */
        getSurface: async (_parent, args, context) => {
            // Check if surface already exists
            const field = await context.mapper.getField(args.fieldId);
            if (!field) {
                throw new Error(`Field ${args.fieldId} not found`);
            }
            // Generate surface
            return await context.mapper.generateSurface(args.fieldId, args.dimensions);
        },
        /**
         * Get turbulent zones
         */
        getTurbulentZones: async (_parent, args, context) => {
            const zones = await context.mapper.getZones(args.fieldId);
            if (zones.length === 0) {
                // If no zones exist, identify them
                return await context.mapper.identifyZones(args.fieldId, args.threshold);
            }
            // Filter by threshold if provided
            if (args.threshold !== undefined) {
                return zones.filter(z => z.intensity >= args.threshold);
            }
            return zones;
        },
        /**
         * Get stabilization plan
         */
        getStabilizationPlan: async (_parent, args, context) => {
            return await context.mapper.getStabilizationPlan(args.zoneId);
        },
        /**
         * List all fields for investigation
         */
        listFields: async (_parent, args, context) => {
            return await context.mapper.listFields(args.investigationId);
        },
    },
    Mutation: {
        /**
         * Generate new uncertainty field
         */
        generateField: async (_parent, args, context) => {
            // In production, fetch predictions from prediction service
            const predictions = generateMockPredictions(args.investigationId);
            // Parse dimensions
            const dimensions = args.config.dimensions.map((d) => ({
                name: d.name,
                type: d.type.toLowerCase(),
                range: {
                    min: d.range.min,
                    max: d.range.max,
                    categories: d.range.categories,
                },
                unit: d.unit,
            }));
            // Parse resolution
            const resolution = {
                gridSize: args.config.resolution.gridSize,
                adaptiveRefinement: args.config.resolution.adaptiveRefinement || false,
                minPointDensity: args.config.resolution.minPointDensity || 0.01,
            };
            return await context.mapper.generateField(args.investigationId, predictions, dimensions, resolution);
        },
        /**
         * Manually mark turbulent zone
         */
        markZone: async (_parent, args, context) => {
            return await context.mapper.markZone(args.fieldId, args.bounds, context.userId, args.notes);
        },
        /**
         * Apply stabilization strategy
         */
        applyStabilization: async (_parent, args, context) => {
            return await context.mapper.applyStabilization(args.strategyId);
        },
        /**
         * Delete field
         */
        deleteField: async (_parent, args, context) => {
            return await context.mapper.deleteField(args.fieldId);
        },
    },
    UncertaintyField: {
        /**
         * Resolve turbulent zones for field
         */
        turbulentZones: async (parent, _args, context) => {
            return await context.mapper.getZones(parent.id);
        },
    },
    TurbulentZone: {
        /**
         * Resolve recommendations for zone
         */
        recommendations: async (parent, _args, context) => {
            return await context.mapper.getStabilizationPlan(parent.id);
        },
    },
};
/**
 * Generate mock predictions for testing
 * In production, this would fetch from the prediction service
 */
function generateMockPredictions(investigationId) {
    const predictions = [];
    const count = 50;
    for (let i = 0; i < count; i++) {
        predictions.push({
            id: `pred-${investigationId}-${i}`,
            values: {
                time: Math.random(),
                confidence: 0.3 + Math.random() * 0.7,
                impact: Math.random(),
            },
            uncertainty: Math.random() * 0.8,
            confidence: 0.3 + Math.random() * 0.7,
            metadata: {
                source: 'mock',
                timestamp: new Date().toISOString(),
            },
        });
    }
    return predictions;
}
