
import { PatternOfLifeService } from '../PatternOfLifeService';
import { ProvenanceEntry } from '../../provenance/ledger';

describe('PatternOfLifeService', () => {
  let service: PatternOfLifeService;

  beforeEach(() => {
    service = new PatternOfLifeService();
  });

  const createEvent = (
    timestamp: Date,
    actionType: string,
    id = 'test-id'
  ): ProvenanceEntry => ({
    id,
    tenantId: 'tenant-1',
    sequenceNumber: BigInt(1),
    previousHash: 'prev',
    currentHash: 'curr',
    timestamp,
    actionType,
    resourceType: 'resource',
    resourceId: 'res-1',
    actorId: 'user-1',
    actorType: 'user',
    payload: {},
    metadata: {},
  });

  describe('detectPeriodicity', () => {
    it('should detect a perfect periodic pattern', () => {
      const now = new Date();
      const events: ProvenanceEntry[] = [];

      // Create an event every hour (3600 seconds)
      for (let i = 0; i < 10; i++) {
        events.push(createEvent(new Date(now.getTime() + i * 3600 * 1000), 'LOGIN'));
      }

      const patterns = service.detectPeriodicity(events);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe('periodicity');
      expect(patterns[0].metadata.actionType).toBe('LOGIN');
      expect(patterns[0].metadata.intervalSeconds).toBeCloseTo(3600);
      expect(patterns[0].confidence).toBeGreaterThan(0.9);
    });

    it('should ignore irregular patterns', () => {
      const now = new Date();
      const events: ProvenanceEntry[] = [
        createEvent(new Date(now.getTime()), 'RANDOM'),
        createEvent(new Date(now.getTime() + 1000), 'RANDOM'), // +1s
        createEvent(new Date(now.getTime() + 50000), 'RANDOM'), // +49s
        createEvent(new Date(now.getTime() + 51000), 'RANDOM'), // +1s
      ];

      const patterns = service.detectPeriodicity(events);
      expect(patterns).toHaveLength(0);
    });

    it('should handle multiple event types', () => {
        const now = new Date();
        const events: ProvenanceEntry[] = [];

        // LOGIN every hour
        for (let i = 0; i < 5; i++) {
          events.push(createEvent(new Date(now.getTime() + i * 3600 * 1000), 'LOGIN'));
        }

        // LOGOUT every hour (offset by 30 mins)
        for (let i = 0; i < 5; i++) {
          events.push(createEvent(new Date(now.getTime() + i * 3600 * 1000 + 1800 * 1000), 'LOGOUT'));
        }

        const patterns = service.detectPeriodicity(events);

        expect(patterns).toHaveLength(2);
        const loginPattern = patterns.find(p => p.metadata.actionType === 'LOGIN');
        const logoutPattern = patterns.find(p => p.metadata.actionType === 'LOGOUT');

        expect(loginPattern).toBeDefined();
        expect(logoutPattern).toBeDefined();
    });
  });

  describe('detectSequences', () => {
      it('should detect repeated sequences', () => {
          const now = new Date();
          const events: ProvenanceEntry[] = [];

          // Pattern: A -> B -> C repeated 3 times
          const seq = ['A', 'B', 'C'];
          for(let i=0; i<3; i++) {
              seq.forEach((action, idx) => {
                  events.push(createEvent(new Date(now.getTime() + i*10000 + idx*1000), action));
              });
          }
          // Add some noise
          events.push(createEvent(new Date(now.getTime() + 40000), 'D'));

          const patterns = service.detectSequences(events);

          // Should detect 'A|B', 'B|C', 'A|B|C' at least
          const fullSeq = patterns.find(p => p.metadata.sequence.join('|') === 'A|B|C');
          expect(fullSeq).toBeDefined();
          expect(fullSeq?.metadata.occurrenceCount).toBe(3);
      });
  });

  describe('detectTimeDistribution', () => {
      it('should identify active hours', () => {
         const events: ProvenanceEntry[] = [];
         // All events at 10 AM on different days
         for(let i=0; i<10; i++) {
             const d = new Date('2023-01-01T10:00:00Z');
             d.setDate(d.getDate() + i);
             events.push(createEvent(d, 'WORK'));
         }

         const patterns = service.detectTimeDistribution(events);
         expect(patterns).toHaveLength(1);
         expect(patterns[0].metadata.activeHours).toContain(10);
      });
  });
});
