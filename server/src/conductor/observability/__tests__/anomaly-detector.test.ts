import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from '@jest/globals';

const warnMock = jest.fn();
const recordOperationalEventMock = jest.fn();

jest.unstable_mockModule('../../../config/logger.js', () => ({
  default: {
    warn: warnMock,
  },
}));

jest.unstable_mockModule('../prometheus.js', () => ({
  prometheusConductorMetrics: {
    recordOperationalEvent: recordOperationalEventMock,
  },
}));

let detectTaskIdAnomalies: typeof import('../anomaly-detector.js').detectTaskIdAnomalies;
let detectDiffAnomalies: typeof import('../anomaly-detector.js').detectDiffAnomalies;

describe('anomaly-detector', () => {
  beforeAll(async () => {
    ({ detectTaskIdAnomalies, detectDiffAnomalies } = await import(
      '../anomaly-detector.js'
    ));
  });

  beforeEach(() => {
    warnMock.mockClear();
    recordOperationalEventMock.mockClear();
  });

  it('flags suspicious task IDs and emits metrics', () => {
    const signals = detectTaskIdAnomalies('tmp-1234');
    expect(signals.some((signal) => signal.reason.includes('prefix'))).toBe(
      true,
    );
    expect(recordOperationalEventMock).toHaveBeenCalledWith(
      'anomaly_detected',
      expect.objectContaining({ channel: 'task' }),
    );
  });

  it('flags risky diff content', () => {
    const signals = detectDiffAnomalies(
      'AWS_SECRET_ACCESS_KEY=abc',
      'repo#12',
    );
    expect(signals.some((signal) => signal.severity === 'critical')).toBe(true);
    expect(recordOperationalEventMock).toHaveBeenCalledWith(
      'anomaly_detected',
      expect.objectContaining({ channel: 'diff' }),
    );
  });
});
