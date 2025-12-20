import { checkAction } from '../check';
import { runCommandWithStream, execAsync } from '../../utils';

jest.mock('../../utils', () => ({
  runCommandWithStream: jest.fn().mockResolvedValue(undefined),
  execAsync: jest.fn().mockResolvedValue({ stdout: 'version 1.0.0' }),
}));

describe('check command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  it('runs all checks by default', async () => {
    await checkAction({});
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run lint', 'Linting code');
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run typecheck', 'Checking types');
    expect(runCommandWithStream).toHaveBeenCalledWith('npm audit', 'Dependency Audit');
  });

  it('skips linting when --no-lint is provided', async () => {
    await checkAction({ lint: false });
    expect(runCommandWithStream).not.toHaveBeenCalledWith('npm run lint', expect.any(String));
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run typecheck', expect.any(String));
  });

  it('skips types when --no-types is provided', async () => {
    await checkAction({ types: false });
    expect(runCommandWithStream).toHaveBeenCalledWith('npm run lint', expect.any(String));
    expect(runCommandWithStream).not.toHaveBeenCalledWith('npm run typecheck', expect.any(String));
  });

  it('handles errors gracefully', async () => {
    (runCommandWithStream as jest.Mock).mockRejectedValueOnce(new Error('Lint failed'));
    await checkAction({});
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
