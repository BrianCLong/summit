"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entanglementResolvers = void 0;
exports.entanglementResolvers = {
    Query: {
        detectEntanglements: async (_parent, args, context) => {
            // In production, this would fetch actual time-series data from metrics store
            // For now, we'll create mock data
            const timeSeriesData = args.systemIds.map((systemId) => ({
                systemId,
                timestamps: generateMockTimestamps(args.observationWindowMs || 300000),
                values: generateMockValues(100),
            }));
            return await context.detector.detectEntanglements(timeSeriesData);
        },
        getEntanglementMap: async (_parent, args, context) => {
            return context.detector.getEntanglementMap(args.includeWeak, args.domainFilter);
        },
        getCouplings: async (_parent, args, context) => {
            return context.detector.getCouplings(args.systemId, args.minStrength);
        },
        getRiskScores: async (_parent, args, context) => {
            return context.detector.getAllRiskScores(args.systemIds);
        },
        getSynchronizationEvents: async (_parent, args, context) => {
            return context.detector.getSynchronizationEvents(args.startTime, args.endTime, args.systemIds, args.minScore);
        },
        getSystems: async (_parent, args, _context) => {
            // In production, this would fetch from a system registry
            // For now, return empty array
            return [];
        },
        getSystem: async (_parent, args, _context) => {
            // In production, this would fetch from a system registry
            return null;
        },
        findCriticalPaths: async (_parent, args, context) => {
            const riskScore = context.detector.getRiskScore(args.sourceSystemId);
            if (!riskScore) {
                return [];
            }
            let paths = riskScore.criticalPaths;
            // Filter by target if specified
            if (args.targetSystemId) {
                paths = paths.filter((path) => path.path.includes(args.targetSystemId));
            }
            // Filter by probability
            if (args.minProbability !== undefined) {
                paths = paths.filter((path) => path.propagationProbability >= args.minProbability);
            }
            // Filter by depth
            if (args.maxDepth !== undefined) {
                paths = paths.filter((path) => path.path.length <= args.maxDepth);
            }
            return paths;
        },
        discoverCrossDomainCorrelations: async (_parent, args, context) => {
            // In production, this would fetch domain metrics from monitoring systems
            // For now, return empty array
            const domainMetrics = [];
            return await context.detector.discoverCrossDomainCorrelations(domainMetrics);
        },
    },
    Mutation: {
        registerSystem: async (_parent, args, _context) => {
            // In production, this would persist to a system registry
            return {
                id: args.input.systemId,
                name: args.input.name,
                domain: args.input.domain,
                subsystem: args.input.subsystem || null,
                metricEndpoints: args.input.metricEndpoints,
                registeredAt: new Date(),
                lastSeen: null,
                couplings: [],
                entanglements: [],
                riskScore: null,
            };
        },
        scanForEntanglements: async (_parent, args, context) => {
            const startTime = Date.now();
            try {
                // In production, this would trigger a background scan job
                // For now, just return mock results
                const stats = context.detector.getStatistics();
                return {
                    success: true,
                    scannedSystems: args.systemIds?.length || 0,
                    signaturesFound: stats.signatureCount,
                    couplingsFound: stats.couplingCount,
                    duration: Date.now() - startTime,
                    errors: [],
                };
            }
            catch (error) {
                return {
                    success: false,
                    scannedSystems: 0,
                    signaturesFound: 0,
                    couplingsFound: 0,
                    duration: Date.now() - startTime,
                    errors: [error instanceof Error ? error.message : 'Unknown error'],
                };
            }
        },
        ingestMetrics: async (_parent, args, _context) => {
            // In production, this would store metrics in time-series database
            // For now, just return success
            return true;
        },
        unregisterSystem: async (_parent, args, _context) => {
            // In production, this would remove from system registry
            return true;
        },
        clearEntanglementData: async (_parent, _args, context) => {
            context.detector.clearAll();
            return true;
        },
    },
};
// Helper functions
function generateMockTimestamps(windowMs) {
    const timestamps = [];
    const now = Date.now();
    const interval = 1000; // 1 second
    const count = Math.floor(windowMs / interval);
    for (let i = 0; i < count; i++) {
        timestamps.push(now - windowMs + i * interval);
    }
    return timestamps;
}
function generateMockValues(count) {
    const values = [];
    let current = 50;
    for (let i = 0; i < count; i++) {
        // Random walk
        current += (Math.random() - 0.5) * 10;
        current = Math.max(0, Math.min(100, current));
        values.push(current);
    }
    return values;
}
