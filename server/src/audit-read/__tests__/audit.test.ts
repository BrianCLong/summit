
import { AuditQueryService } from '../AuditQueryService';

describe('AuditQueryService', () => {
    const service = new AuditQueryService();

    it('should filter by tenant strictly', async () => {
        const t1 = await service.search({ tenantId: 't1' });
        expect(t1).toHaveLength(2);
        expect(t1.every(e => e.tenantId === 't1')).toBe(true);

        const t2 = await service.search({ tenantId: 't2' });
        expect(t2).toHaveLength(1);
    });

    it('should respect filters', async () => {
        const results = await service.search({ tenantId: 't1', action: 'LOGIN' });
        expect(results).toHaveLength(1);
        expect(results[0].action).toBe('LOGIN');
    });

    it('should paginate', async () => {
        // Mock more data
        // ...
        // Using existing 2 items for t1
        const p1 = await service.search({ tenantId: 't1' }, 1, 1);
        expect(p1).toHaveLength(1);
        expect(p1[0].id).toBe('1');

        const p2 = await service.search({ tenantId: 't1' }, 2, 1);
        expect(p2).toHaveLength(1);
        expect(p2[0].id).toBe('2');
    });

    it('should deny access to other tenant events by ID', async () => {
        const event = await service.getById('3', 't1'); // Event 3 belongs to t2
        expect(event).toBeNull();
    });
});
