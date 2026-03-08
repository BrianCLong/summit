"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolvers_1 = require("../src/graphql/resolvers");
test('deployFearsomeOps escalates', async () => {
    const plan = await resolvers_1.resolvers.Mutation.deployFearsomeOps(null, {
        ids: ['1'],
        tuners: { fearsomeMode: 0.9 },
    });
    expect(plan.agenticSwarms).toBeDefined();
});
