import { instrumentSession } from '../neo4j.js';
import { neo4jPerformanceMonitor } from '../neo4jPerformanceMonitor.js';
import { neo4jQueryTotal } from '../../metrics/neo4jMetrics.js';

function createSession(runImpl: (...args: any[]) => Promise<any>) {
  return { run: runImpl } as any;
}

describe('instrumentSession', () => {
  beforeEach(() => {
    neo4jPerformanceMonitor.reset();
  });

  it('passes transaction config through and infers labels from the query', async () => {
    const runSpy = jest.fn().mockResolvedValue({ records: [] });
    const session = createSession(runSpy);
    const instrumented = instrumentSession(session);
    const successSpy = jest.spyOn(neo4jPerformanceMonitor, 'recordSuccess');

    await instrumented.run('MATCH (n:Person) RETURN n', { id: 1 }, { timeout: 10 });

    expect(runSpy).toHaveBeenCalledWith(
      'MATCH (n:Person) RETURN n',
      { id: 1 },
      { timeout: 10 },
    );
    expect(successSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: { operation: 'read', label: 'Person' },
      }),
    );

    const totalValues = neo4jQueryTotal.get().values;
    expect(totalValues[0].labels).toMatchObject({ operation: 'read', label: 'Person' });

    successSpy.mockRestore();
  });

  it('records errors with default labels when none are provided', async () => {
    const runSpy = jest.fn().mockRejectedValue(new Error('boom'));
    const session = createSession(runSpy);
    const instrumented = instrumentSession(session);
    const errorSpy = jest.spyOn(neo4jPerformanceMonitor, 'recordError');

    await expect(instrumented.run('RETURN 1')).rejects.toThrow('boom');

    expect(runSpy).toHaveBeenCalledWith('RETURN 1', undefined, undefined);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: { operation: 'read', label: 'unlabeled' },
        error: 'boom',
      }),
    );

    errorSpy.mockRestore();
  });
});
