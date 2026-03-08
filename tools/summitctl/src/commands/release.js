"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("../utils");
exports.releaseCommand = new commander_1.Command('release-dry-run')
    .description('Simulate release process locally')
    .action(async () => {
    console.log(chalk_1.default.bold('Simulating Release Process...'));
    try {
        // 1. Build
        await (0, utils_1.runCommandWithStream)('npm run build', 'Building artifacts');
        // 2. Semantic Release Dry Run
        await (0, utils_1.runCommandWithStream)('npx semantic-release --dry-run', 'Semantic Release Dry Run');
        console.log(chalk_1.default.green('\nRelease simulation completed successfully!'));
        console.log(chalk_1.default.blue('No changes were pushed.'));
    }
    catch (error) {
        console.error(chalk_1.default.red('\nRelease simulation failed.'));
        process.exit(1);
    }
});
