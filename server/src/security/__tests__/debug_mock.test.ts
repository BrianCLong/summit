import { IntelGraphClientImpl } from '../../intelgraph/client-impl.js';
import { getNeo4jDriver } from '../../config/database.js';

describe('Mock Resolution Debug', () => {
    it('should resolve getNeo4jDriver as a mock function', () => {
        console.log('getNeo4jDriver type:', typeof getNeo4jDriver);
        const client = new IntelGraphClientImpl();
        const driver = (client as any).driver;
        console.log('Client driver value:', driver);
        expect(getNeo4jDriver).toBeDefined();
    });
});
