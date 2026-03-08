"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const events_1 = require("events");
// Mock pino logger
const mockLogger = {
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
};
// Mock child_process
const spawnMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('child_process', () => ({
    spawn: spawnMock,
}));
(0, globals_1.describe)('ActionSandbox', () => {
    let ActionSandbox;
    let sandbox;
    let spawn;
    const defaultConfig = {
        timeoutMs: 1000,
        maxMemoryMB: 128,
        maxCpuPercent: 50,
        networkPolicy: 'none',
        allowedHosts: [],
        allowedPorts: [],
        workingDir: '/work',
        readOnlyPaths: [],
        environment: {},
    };
    (0, globals_1.beforeAll)(async () => {
        ({ ActionSandbox } = await Promise.resolve().then(() => __importStar(require('../../src/autonomous/sandbox'))));
        ({ spawn } = await Promise.resolve().then(() => __importStar(require('child_process'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        sandbox = new ActionSandbox(mockLogger);
        sandbox.networkGuard = {
            monitor: () => ({ on: globals_1.jest.fn(), stop: globals_1.jest.fn() }),
        };
        globals_1.jest.spyOn(sandbox, 'getContainerStats').mockResolvedValue(null);
        spawn.mockImplementation(() => {
            const ee = new events_1.EventEmitter();
            ee.stdout = new events_1.EventEmitter();
            ee.stderr = new events_1.EventEmitter();
            ee.kill = globals_1.jest.fn(() => ee.emit('close', 0));
            setTimeout(() => ee.emit('close', 0), 10);
            return ee;
        });
    });
    (0, globals_1.describe)('buildDockerArgs', () => {
        (0, globals_1.it)('should include resource limits', async () => {
            // We can't access private method directly, so we inspect spawn calls
            await sandbox.execute({
                id: 'test-id',
                command: ['echo', 'hello'],
                config: defaultConfig,
                artifacts: new Map(),
                logger: mockLogger,
            });
            const spawnCalls = spawn.mock.calls;
            const dockerCall = spawnCalls.find(call => call[0] === 'docker' && call[1].includes('run'));
            (0, globals_1.expect)(dockerCall).toBeDefined();
            const args = dockerCall[1];
            (0, globals_1.expect)(args).toContain('--memory');
            (0, globals_1.expect)(args).toContain('128m');
            (0, globals_1.expect)(args).toContain('--cpus');
            (0, globals_1.expect)(args).toContain('0.5');
            (0, globals_1.expect)(args).toContain('--network');
            (0, globals_1.expect)(args).toContain('none');
        });
    });
    (0, globals_1.describe)('Output Filtering', () => {
        (0, globals_1.it)('should detect secrets in stdout', async () => {
            spawn.mockImplementation(() => {
                const ee = new events_1.EventEmitter();
                ee.stdout = new events_1.EventEmitter();
                ee.stderr = new events_1.EventEmitter();
                ee.kill = globals_1.jest.fn();
                setTimeout(() => {
                    ee.stdout.emit('data', 'Here is my API Key: sk-12345');
                    ee.emit('close', 0);
                }, 10);
                return ee;
            });
            const result = await sandbox.execute({
                id: 'test-secret',
                command: ['echo', 'secret'],
                config: defaultConfig,
                artifacts: new Map(),
                logger: mockLogger,
            });
            (0, globals_1.expect)(result.violations).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringMatching(/Suspicious output detected/)]));
        });
    });
    (0, globals_1.describe)('Timeout', () => {
        (0, globals_1.it)('should kill process on timeout', async () => {
            const killMock = globals_1.jest.fn();
            const spawnedProcess = new events_1.EventEmitter();
            spawn.mockImplementation(() => {
                spawnedProcess.stdout = new events_1.EventEmitter();
                spawnedProcess.stderr = new events_1.EventEmitter();
                spawnedProcess.kill = (...args) => {
                    killMock(...args);
                    setImmediate(() => spawnedProcess.emit('close', 137));
                };
                // Never close automatically
                return spawnedProcess;
            });
            const execPromise = sandbox.execute({
                id: 'test-timeout',
                command: ['sleep', '10'],
                config: { ...defaultConfig, timeoutMs: 100 },
                artifacts: new Map(),
                logger: mockLogger,
            });
            const result = await execPromise;
            (0, globals_1.expect)(killMock).toHaveBeenCalledWith('SIGKILL');
            (0, globals_1.expect)(result.violations).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringMatching(/Execution timeout/)]));
        });
    });
});
