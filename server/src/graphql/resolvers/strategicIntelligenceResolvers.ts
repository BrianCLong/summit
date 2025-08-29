import {
  runThreatCorrelation,
  runWargameOptimizer,
  runSentimentVolatility,
  runStegoAnalyzer,
} from '../../services/strategicIntelligenceServices';

export const strategicIntelligenceResolvers = {
  Mutation: {
    correlateThreats: async (_: any, { osintInput }: { osintInput: any }) => {
      return runThreatCorrelation(osintInput);
    },
    optimizeWargame: async (_: any, { logsInput }: { logsInput: any }) => {
      return runWargameOptimizer(logsInput);
    },
    analyzeSentimentVolatility: async (_: any, { signalsInput }: { signalsInput: any }) => {
      return runSentimentVolatility(signalsInput);
    },
    analyzeStego: async (_: any, { mediaDataInput }: { mediaDataInput: any }) => {
      return runStegoAnalyzer(mediaDataInput);
    },
  },
};
