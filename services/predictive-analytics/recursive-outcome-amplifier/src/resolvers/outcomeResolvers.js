"use strict";
/**
 * GraphQL Resolvers for Recursive Outcome Amplifier
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.outcomeResolvers = void 0;
exports.createContext = createContext;
exports.outcomeResolvers = {
    Query: {
        /**
         * Get cascade map by ID
         */
        getCascadeMap: async (_parent, args, context) => {
            return context.amplifier.getCascadeMap(args.cascadeId);
        },
        /**
         * Find leverage points in a cascade
         */
        findLeveragePoints: async (_parent, args, context) => {
            return context.amplifier.findLeveragePoints(args.cascadeId, {
                topN: args.topN ?? 10,
            });
        },
        /**
         * Get amplification path to specific node
         */
        getAmplificationPath: async (_parent, args, context) => {
            return context.amplifier.getAmplificationPath(args.cascadeId, args.targetNodeId);
        },
        /**
         * List all cascades
         */
        listCascades: async (_parent, args, context) => {
            return context.amplifier.listCascades(args.limit ?? 20, args.offset ?? 0);
        },
        /**
         * Get amplification analysis
         */
        getAmplificationAnalysis: async (_parent, args, context) => {
            return context.amplifier.getAmplificationAnalysis(args.cascadeId);
        },
    },
    Mutation: {
        /**
         * Amplify outcomes for an event (main entry point)
         */
        amplifyOutcome: async (_parent, args, context) => {
            const eventInput = {
                event: args.event.description,
                domain: args.event.domain,
                initialMagnitude: args.event.initialMagnitude,
                context: args.event.context,
            };
            const simulationOptions = {
                maxOrder: args.options?.maxOrder,
                probabilityThreshold: args.options?.probabilityThreshold,
                magnitudeThreshold: args.options?.magnitudeThreshold,
                timeHorizon: args.options?.timeHorizon,
                includeWeakLinks: args.options?.includeWeakLinks,
            };
            return context.amplifier.amplifyOutcome(eventInput, simulationOptions);
        },
        /**
         * Run cascade simulation for existing event
         */
        runCascadeSimulation: async (_parent, args, context) => {
            // In a real implementation, this would load the event from storage
            // For now, we'll throw an error indicating this needs implementation
            throw new Error('runCascadeSimulation requires event storage implementation');
        },
        /**
         * Define a new event for future analysis
         */
        defineEvent: async (_parent, args, _context) => {
            // In a real implementation, this would store the event
            // For now, we'll return a simple outcome node
            return {
                id: `event-${Date.now()}`,
                event: args.event.description,
                order: 1,
                probability: 1.0,
                magnitude: args.event.initialMagnitude,
                timeDelay: 0,
                domain: args.event.domain,
                confidence: 0.9,
                evidenceStrength: 1.0,
                parentNodes: [],
                childNodes: [],
                createdAt: new Date(),
            };
        },
    },
    // Field resolvers
    OutcomeNode: {
        parentNodes: async (parent, _args, context) => {
            // Resolve parent nodes from parent.parentNodes array
            // In a full implementation, this would fetch from Neo4j
            return parent.parentNodes || [];
        },
        childNodes: async (parent, _args, context) => {
            // Resolve child nodes from parent.childNodes array
            // In a full implementation, this would fetch from Neo4j
            return parent.childNodes || [];
        },
    },
    LeveragePoint: {
        node: async (parent, _args, context) => {
            // Resolve the full node from nodeId
            // This requires access to the cascade - would need to be passed in context
            // For now, return a placeholder
            return {
                id: parent.nodeId,
                event: 'Node details',
                order: 2,
                probability: 0.5,
                magnitude: 1.0,
                timeDelay: 24,
                domain: 'UNKNOWN',
                confidence: 0.5,
                evidenceStrength: 0.5,
                parentNodes: [],
                childNodes: [],
                createdAt: new Date(),
            };
        },
    },
    CascadeMap: {
        nodes: (parent) => {
            return parent.nodes || [];
        },
        criticalPaths: (parent) => {
            return parent.criticalPaths || [];
        },
        leveragePoints: (parent) => {
            return parent.leveragePoints || [];
        },
    },
};
/**
 * Create resolver context
 */
function createContext(amplifier) {
    return {
        amplifier,
    };
}
