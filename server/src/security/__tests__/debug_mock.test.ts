import { jest } from '@jest/globals';

// Explicitly mock the database config using unstable_mockModule for ESM support
jest.unstable_mockModule('../../config/database.js', () => ({
    getNeo4jDriver: jest.fn().mockReturnValue({}),
}));

describe('Mock Resolution Debug', () => {
    it('should resolve getNeo4jDriver as a mock function', async () => {
        const { getNeo4jDriver } = await import('../../config/database.js');
        const { IntelGraphClientImpl } = await import('../../intelgraph/client-impl.js');

        console.log('getNeo4jDriver type:', typeof getNeo4jDriver);
        const client = new IntelGraphClientImpl();
        // Accessing private property for test verification (cast to any)
        const driver = (client as any).driver;
        console.log('Client driver value:', driver);

        expect(getNeo4jDriver).toBeDefined();
        // Verify it returns the mock object
        expect(getNeo4jDriver()).toEqual({});
    });
});
