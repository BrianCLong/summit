import { execSync } from 'child_process';
import { run } from './ga-tag';

jest.mock('child_process');
const mockedExecSync = execSync as jest.Mock;

describe('ga-tag script', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit called with code ${code}`);
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should successfully create a tag in dry-run mode', () => {
    mockedExecSync.mockReturnValueOnce('main'); // git branch
    mockedExecSync.mockReturnValueOnce(''); // git status
    mockedExecSync.mockReturnValueOnce(''); // git tag

    run(['1.0.0', '--dry-run']);

    expect(consoleLogSpy).toHaveBeenCalledWith('Normalized version: v1.0.0');
    expect(consoleLogSpy).toHaveBeenCalledWith('Dry run complete. No tag was created.');
    expect(mockedExecSync).not.toHaveBeenCalledWith(expect.stringContaining('git tag -a'));
  });

  it('should successfully create a tag', () => {
    mockedExecSync.mockReturnValueOnce('main'); // git branch
    mockedExecSync.mockReturnValueOnce(''); // git status
    mockedExecSync.mockReturnValueOnce(''); // git tag

    run(['v1.0.0']);

    expect(consoleLogSpy).toHaveBeenCalledWith('Successfully created annotated tag: v1.0.0');
    expect(mockedExecSync).toHaveBeenCalledWith('git tag -a "v1.0.0" -m "Release v1.0.0"');
  });

  it('should exit if version is missing', () => {
    expect(() => run([])).toThrow('process.exit called with code 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Version input is required.');
  });

  it('should exit for invalid semver', () => {
    expect(() => run(['invalid-version'])).toThrow('process.exit called with code 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid version format'));
  });

  it('should exit if not on main branch', () => {
    mockedExecSync.mockReturnValueOnce('feature-branch');
    expect(() => run(['1.0.0'])).toThrow('process.exit called with code 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Must be on the "main" branch'));
  });

  it('should exit if working tree is dirty', () => {
    mockedExecSync.mockReturnValueOnce('main');
    mockedExecSync.mockReturnValueOnce('M modified-file.ts');
    expect(() => run(['1.0.0'])).toThrow('process.exit called with code 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Working tree is not clean'));
  });

  it('should exit if tag already exists', () => {
    mockedExecSync.mockReturnValueOnce('main');
    mockedExecSync.mockReturnValueOnce('');
    mockedExecSync.mockReturnValueOnce('v1.0.0');
    expect(() => run(['1.0.0'])).toThrow('process.exit called with code 1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });
});
