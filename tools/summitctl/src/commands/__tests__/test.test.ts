import { testAction } from '../test';
import { runCommandWithStream } from '../../utils';

jest.mock('../../utils', () => ({
  runCommandWithStream: jest.fn().mockResolvedValue(undefined),
}));

describe('test command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  it('runs all tests by default', async () => {
    await testAction({});
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run test:unit', 'Unit Tests');
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run test:integration', 'Integration Tests');
    expect(runCommandWithStream).toHaveBeenCalledWith('make smoke', 'Smoke Tests');
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run test:e2e', 'E2E Tests');
  });

  it('runs only unit tests when --unit is provided', async () => {
    await testAction({ unit: true });
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run test:unit', 'Unit Tests');
    expect(runCommandWithStream).not.toHaveBeenCalledWith('npm run test:integration', expect.any(String));
  });

  it('runs all tests when --all is provided', async () => {
    await testAction({ all: true });
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run test:unit', 'Unit Tests');
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run test:integration', 'Integration Tests');
  });
});
