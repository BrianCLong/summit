"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolvers_1 = require("../src/graphql/resolvers");
test('v13 deployCollaborative scales hyper', async () => {
    const plan = await resolvers_1.resolvers.Mutation.deployCollaborative(null, {
        config: {
            collaborationIntensity: 1.0,
            globalImpact: 1e16,
            integrityThreshold: 0.001,
        },
    });
    expect(plan.harmonizedInsight.insight).toContain('1e16');
    expect(plan.riskMitigator.mitigation).toContain('0.001');
});
