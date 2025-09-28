const fs = require('fs');
const path = require('path');
const { LineageEmitter } = require('./lineageEmitter');

describe('LineageEmitter', () => {
  const logPath = path.join(__dirname, '__log.json');
  const dlqPath = path.join(__dirname, '__dlq.json');

  afterEach(() => {
    [logPath, dlqPath].forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  test('creates run events with defaults', () => {
    const emitter = new LineageEmitter({ logPath, dlqPath, jobName: 'cdc-job' });
    const event = emitter.createRunEvent('START', null, 'run-1');
    expect(event.job.name).toBe('cdc-job');
    expect(event.eventType).toBe('START');
  });

  test('records events locally when endpoint is missing', async () => {
    const emitter = new LineageEmitter({ logPath, dlqPath, jobName: 'cdc-job' });
    const event = emitter.createRunEvent('COMPLETE', null, 'run-2');
    const result = await emitter.emitEvent(event);
    expect(result.delivered).toBe(false);
    const stored = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    expect(stored).toHaveLength(1);
  });
});
