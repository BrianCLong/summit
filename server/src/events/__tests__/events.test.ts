
import { EventLog } from '../EventLog';
import { ReplayEngine } from '../ReplayEngine';
import { EventType } from '../types';

describe('Event Sourcing System', () => {
    let log: EventLog;

    beforeEach(() => {
        log = new EventLog();
    });

    it('should log events with integrity hash', async () => {
        const evt = await log.append(
            EventType.NODE_CREATED,
            'tenant-1',
            'user-1',
            'node-A',
            'node',
            null,
            { id: 'node-A', name: 'Alpha' }
        );

        expect(evt).toBeDefined();
        expect(evt.previousHash).toBe('');
        expect(evt.hash).toBeDefined();

        const evt2 = await log.append(
            EventType.NODE_UPDATED,
            'tenant-1',
            'user-1',
            'node-A',
            'node',
            { id: 'node-A', name: 'Alpha' },
            { id: 'node-A', name: 'AlphaUpdated' }
        );

        expect(evt2.previousHash).toBe(evt.hash);
    });

    it('should replay state correctly', async () => {
        // 1. Create
        await log.append(
            EventType.NODE_CREATED,
            't1', 'u1', 'node-1', 'node', null, { id: 'node-1', val: 1 }
        );
        // 2. Update
        await log.append(
            EventType.NODE_UPDATED,
            't1', 'u1', 'node-1', 'node', { id: 'node-1', val: 1 }, { id: 'node-1', val: 2 }
        );
        // 3. Create another
        await log.append(
            EventType.NODE_CREATED,
            't1', 'u1', 'node-2', 'node', null, { id: 'node-2', val: 10 }
        );

        const events = await log.getEvents('t1');
        const state = ReplayEngine.rebuildState(events);

        expect(state.size).toBe(2);
        expect(state.get('node-1')).toEqual({ id: 'node-1', val: 2 });
        expect(state.get('node-2')).toEqual({ id: 'node-2', val: 10 });
    });
});
