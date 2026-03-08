"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coalescer_1 = require("../../server/src/services/coalescer");
// Mock runCypher to track calls
const mockRunCypher = jest.fn();
jest.mock('../../server/src/graph/neo4j', () => ({
    runCypher: (query, params) => mockRunCypher(query, params),
}));
describe('Coalescer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers(); // Use fake timers for setTimeout
    });
    afterEach(() => {
        jest.runOnlyPendingTimers(); // Ensure all timers are cleared
        jest.useRealTimers(); // Restore real timers
    });
    test('should flush after maxDelayMs', () => {
        (0, coalescer_1.enqueue)({ type: 'cite', payload: { answerId: 'a1', id: 'e1', kind: 'entity' } }, 50);
        expect(mockRunCypher).not.toHaveBeenCalled(); // Should not flush immediately
        jest.advanceTimersByTime(50); // Advance time by maxDelayMs
        expect(mockRunCypher).toHaveBeenCalledTimes(1); // Should flush
    });
    test('should flush after maxBatch size is reached', () => {
        for (let i = 0; i < 200; i++) {
            (0, coalescer_1.enqueue)({
                type: 'cite',
                payload: { answerId: `a${i}`, id: `e${i}`, kind: 'entity' },
            }, 50);
        }
        expect(mockRunCypher).toHaveBeenCalledTimes(1); // Should flush immediately due to maxBatch
        jest.advanceTimersByTime(50); // No further flush expected
        expect(mockRunCypher).toHaveBeenCalledTimes(1);
    });
    test('should group different types of tasks', () => {
        (0, coalescer_1.enqueue)({ type: 'cite', payload: { answerId: 'a1', id: 'e1', kind: 'entity' } }, 50);
        (0, coalescer_1.enqueue)({ type: 'audit', payload: { type: 'log', message: 'test' } }, 50);
        jest.advanceTimersByTime(50);
        expect(mockRunCypher).toHaveBeenCalledTimes(2); // One for cites, one for audits
    });
    test('should not flush if queue is empty', () => {
        jest.advanceTimersByTime(50);
        expect(mockRunCypher).not.toHaveBeenCalled();
    });
    test('should reset timer after flush', () => {
        (0, coalescer_1.enqueue)({ type: 'cite', payload: { answerId: 'a1', id: 'e1', kind: 'entity' } }, 50);
        jest.advanceTimersByTime(50);
        expect(mockRunCypher).toHaveBeenCalledTimes(1);
        (0, coalescer_1.enqueue)({ type: 'cite', payload: { answerId: 'a2', id: 'e2', kind: 'entity' } }, 50);
        jest.advanceTimersByTime(25);
        expect(mockRunCypher).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(25);
        expect(mockRunCypher).toHaveBeenCalledTimes(2);
    });
});
