"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
exports.resolvers = {
    Query: {
        explainAnomaly: (_, { id }) => {
            // Mock response for now
            return {
                id,
                score: 0.95,
                explanation: 'This anomaly was detected due to unusual login patterns.',
                features: [
                    { name: 'login_time', contribution: 0.8 },
                    { name: 'location', contribution: 0.6 },
                ],
            };
        },
    },
};
