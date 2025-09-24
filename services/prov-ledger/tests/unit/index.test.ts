const loadConfigMock = jest.fn();
const buildAppMock = jest.fn();

jest.mock('../../src/config', () => ({
  loadConfig: loadConfigMock
}));

jest.mock('../../src/app', () => ({
  buildApp: buildAppMock
}));

import main, { runIfMain } from '../../src/index';
import type { AppConfig } from '../../src/config';

describe('index main entrypoint', () => {
  const baseConfig: AppConfig = {
    port: 5050,
    host: '127.0.0.1'
  } as AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    loadConfigMock.mockReset();
    buildAppMock.mockReset();
  });

  it('starts the application and logs success', async () => {
    const listen = jest.fn().mockResolvedValue(undefined);
    const logInfo = jest.fn();
    loadConfigMock.mockReturnValue(baseConfig);
    buildAppMock.mockResolvedValue({ listen, log: { info: logInfo } });

    await main();

    expect(loadConfigMock).toHaveBeenCalled();
    expect(buildAppMock).toHaveBeenCalledWith(baseConfig);
    expect(listen).toHaveBeenCalledWith({ port: baseConfig.port, host: baseConfig.host });
    expect(logInfo).toHaveBeenCalledWith(
      `Provenance ledger listening on ${baseConfig.host}:${baseConfig.port}`
    );
  });

  it('logs failure and exits when startup throws', async () => {
    const error = new Error('boom');
    loadConfigMock.mockReturnValue(baseConfig);
    buildAppMock.mockRejectedValue(error);

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await main();

    expect(consoleError).toHaveBeenCalledWith('Failed to start prov-ledger service', error);
    expect(exit).toHaveBeenCalledWith(1);

    consoleError.mockRestore();
    exit.mockRestore();
  });

  it('invokes provided runner when modules match', async () => {
    const listen = jest.fn().mockResolvedValue(undefined);
    const logInfo = jest.fn();
    loadConfigMock.mockReturnValue(baseConfig);
    buildAppMock.mockResolvedValue({ listen, log: { info: logInfo } });

    const fakeModule = {
      id: 'run-test',
      filename: '/tmp/run-test',
      path: '/tmp',
      exports: {},
      parent: null,
      children: [],
      paths: []
    } as unknown as NodeModule;

    runIfMain(fakeModule, fakeModule, main);
    await new Promise(resolve => setImmediate(resolve));

    expect(loadConfigMock).toHaveBeenCalledTimes(1);
    expect(buildAppMock).toHaveBeenCalledWith(baseConfig);
    expect(listen).toHaveBeenCalledWith({ port: baseConfig.port, host: baseConfig.host });
    expect(logInfo).toHaveBeenCalledWith(
      `Provenance ledger listening on ${baseConfig.host}:${baseConfig.port}`
    );
  });

  it('skips runner when modules do not match', () => {
    const runner = jest.fn();
    const currentModule = {
      id: 'current',
      filename: '/tmp/current',
      path: '/tmp',
      exports: {},
      parent: null,
      children: [],
      paths: []
    } as unknown as NodeModule;

    runIfMain(undefined, currentModule, runner);

    expect(runner).not.toHaveBeenCalled();
  });
});
