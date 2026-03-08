"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const check_1 = require("../check");
const utils_1 = require("../../utils");
jest.mock('../../utils', () => ({
    runCommandWithStream: jest.fn().mockResolvedValue(undefined),
    execAsync: jest.fn().mockResolvedValue({ stdout: 'version 1.0.0' }),
}));
describe('check command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(process, 'exit').mockImplementation((() => { }));
    });
    it('runs all checks by default', async () => {
        await (0, check_1.checkAction)({});
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run lint', 'Linting code');
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run typecheck', 'Checking types');
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm audit', 'Dependency Audit');
    });
    it('skips linting when --no-lint is provided', async () => {
        await (0, check_1.checkAction)({ lint: false });
        expect(utils_1.runCommandWithStream).not.toHaveBeenCalledWith('npm run lint', expect.any(String));
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run typecheck', expect.any(String));
    });
    it('skips types when --no-types is provided', async () => {
        await (0, check_1.checkAction)({ types: false });
        expect(utils_1.runCommandWithStream).toHaveBeenCalledWith('npm run lint', expect.any(String));
        expect(utils_1.runCommandWithStream).not.toHaveBeenCalledWith('npm run typecheck', expect.any(String));
    });
    it('handles errors gracefully', async () => {
        utils_1.runCommandWithStream.mockRejectedValueOnce(new Error('Lint failed'));
        await (0, check_1.checkAction)({});
        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
