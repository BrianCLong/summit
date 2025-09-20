import { runThreatCorrelation, runWargameOptimizer, runSentimentVolatility, runStegoAnalyzer, } from '../../services/strategicIntelligenceServices';
export const strategicIntelligenceResolvers = {
    Mutation: {
        correlateThreats: async (_, { osintInput }) => {
            return runThreatCorrelation(osintInput);
        },
        optimizeWargame: async (_, { logsInput }) => {
            return runWargameOptimizer(logsInput);
        },
        analyzeSentimentVolatility: async (_, { signalsInput }) => {
            return runSentimentVolatility(signalsInput);
        },
        analyzeStego: async (_, { mediaDataInput }) => {
            return runStegoAnalyzer(mediaDataInput);
        },
    },
};
//# sourceMappingURL=strategicIntelligenceResolvers.js.map