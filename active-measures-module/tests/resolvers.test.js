"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolvers_1 = require("../src/graphql/resolvers");
// Mock the driver
const mockDriver = {
    session: () => ({
        run: (query, params) => {
            console.log('Mock run:', query, params);
            return {
                records: [],
            };
        },
        close: () => { },
    }),
};
test('activeMeasuresPortfolio returns tuned measures', async () => {
    const result = await resolvers_1.resolvers.Query.activeMeasuresPortfolio(null, { query: 'disinfo', tuners: { proportionality: 0.7 } }, { driver: mockDriver });
    expect(result).toEqual([]);
});
