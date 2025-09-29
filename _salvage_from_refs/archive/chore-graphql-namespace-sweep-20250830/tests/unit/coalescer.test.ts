import { enqueue } from '../../server/src/services/coalescer';

// Mock runCypher to track calls
const mockRunCypher = jest.fn();
jest.mock('../../server/src/graph/neo4j', () => ({
  runCypher: (query: string, params: any) => mockRunCypher(query, params),
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
    enqueue({ type: 'cite', payload: { answerId: 'a1', id: 'e1', kind: 'entity' } }, 50);
    expect(mockRunCypher).not.toHaveBeenCalled(); // Should not flush immediately

    jest.advanceTimersByTime(50); // Advance time by maxDelayMs
    expect(mockRunCypher).toHaveBeenCalledTimes(1); // Should flush
  });

  test('should flush after maxBatch size is reached', () => {
    for (let i = 0; i < 200; i++) {
      enqueue({ type: 'cite', payload: { answerId: `a${i}`, id: `e${i}`, kind: 'entity' } }, 50);
    }
    expect(mockRunCypher).toHaveBeenCalledTimes(1); // Should flush immediately due to maxBatch
    jest.advanceTimersByTime(50); // No further flush expected
    expect(mockRunCypher).toHaveBeenCalledTimes(1);
  });

  test('should group different types of tasks', () => {
    enqueue({ type: 'cite', payload: { answerId: 'a1', id: 'e1', kind: 'entity' } }, 50);
    enqueue({ type: 'audit', payload: { type: 'log', message: 'test' } }, 50);
    jest.advanceTimersByTime(50);
    expect(mockRunCypher).toHaveBeenCalledTimes(2); // One for cites, one for audits
  });

  test('should not flush if queue is empty', () => {
    jest.advanceTimersByTime(50);
    expect(mockRunCypher).not.toHaveBeenCalled();
  });

  test('should reset timer after flush', () => {
    enqueue({ type: 'cite', payload: { answerId: 'a1', id: 'e1', kind: 'entity' } }, 50);
    jest.advanceTimersByTime(50);
    expect(mockRunCypher).toHaveBeenCalledTimes(1);

    enqueue({ type: 'cite', payload: { answerId: 'a2', id: 'e2', kind: 'entity' } }, 50);
    jest.advanceTimersByTime(25);
    expect(mockRunCypher).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(25);
    expect(mockRunCypher).toHaveBeenCalledTimes(2);
  });
});