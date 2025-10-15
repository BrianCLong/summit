import { appendFileSync } from 'fs';
import { logLearnerMetric } from '../logger';

jest.mock('fs', () => ({
  appendFileSync: jest.fn(),
}));

describe('logLearnerMetric', () => {
  const mockedAppend = appendFileSync as jest.MockedFunction<typeof appendFileSync>;

  beforeEach(() => {
    mockedAppend.mockClear();
  });

  it('serializes payloads as JSON lines in the learner metrics log', () => {
    const payload = { type: 'promotion', championUtility: 0.72 };

    logLearnerMetric(payload);

    expect(mockedAppend).toHaveBeenCalledTimes(1);
    const [filePath, serialized, encoding] = mockedAppend.mock.calls[0];

    expect(String(filePath).endsWith('runs/learner-metrics.jsonl')).toBe(true);
    expect(typeof serialized).toBe('string');
    if (typeof serialized === 'string') {
      expect(serialized).toContain('"type":"promotion"');
      expect(serialized.endsWith('\n')).toBe(true);
    }
    expect(encoding).toBe('utf8');
  });
});
