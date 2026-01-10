import { TrajectoryRecorder } from '../src/trajectory.js';
import { isDockerAvailable, runInSandbox } from '../src/sandbox.js';

describe('Sandbox runner', () => {
  it('skips when docker is unavailable', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const available = await isDockerAvailable();
    if (available) {
      return;
    }
    await expect(runInSandbox({ cmd: ['echo', 'hello'], requireDocker: false })).rejects.toThrow(
      'Docker not available',
    );
  });

  it('runs a simple command when docker is available', async () => {
    const available = await isDockerAvailable();
    if (!available) {
      return;
    }
    const recorder = new TrajectoryRecorder({ filePath: '/tmp/ale-sandbox.jsonl' });
    const result = await runInSandbox({ cmd: ['echo', 'hello'], recorder, image: 'busybox:latest' });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
  }, 30000);
});
