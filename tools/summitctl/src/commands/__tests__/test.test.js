"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("../test");
const utils_1 = require("../../utils");
jest.mock('../../utils', () => ({
    runCommandWithStream: jest.fn().mockResolvedValue(undefined),
}));
describe('test command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(process, 'exit').mockImplementation((() => { }));
    });
    it('runs all tests by default', async () => {
        await (0, test_1.testAction)({});
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run test:unit', 'Unit Tests');
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run test:integration', 'Integration Tests');
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('make smoke', 'Smoke Tests');
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run test:e2e', 'E2E Tests');
    });
    it('runs only unit tests when --unit is provided', async () => {
        await (0, test_1.testAction)({ unit: true });
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run test:unit', 'Unit Tests');
        expect(utils_1.runCommandWithStream).not.toHaveBeenCalledWith('npm run test:integration', expect.any(String));
    });
    it('runs all tests when --all is provided', async () => {
        await (0, test_1.testAction)({ all: true });
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run test:unit', 'Unit Tests');
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run test:integration', 'Integration Tests');
    });
});
