"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlugin = validatePlugin;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const plugin_sdk_1 = require("@intelgraph/plugin-sdk");
async function validatePlugin() {
    const spinner = (0, ora_1.default)('Validating plugin...').start();
    try {
        // Read plugin.json
        const manifestPath = path_1.default.join(process.cwd(), 'plugin.json');
        if (!await fs_extra_1.default.pathExists(manifestPath)) {
            spinner.fail(chalk_1.default.red('plugin.json not found'));
            return;
        }
        const manifest = await fs_extra_1.default.readJson(manifestPath);
        // Validate manifest
        const result = plugin_sdk_1.PluginManifestSchema.safeParse(manifest);
        if (!result.success) {
            spinner.fail(chalk_1.default.red('Invalid plugin manifest'));
            console.log('\nValidation errors:');
            result.error.issues.forEach((issue) => {
                console.log(chalk_1.default.red(`  - ${issue.path.join('.')}: ${issue.message}`));
            });
            return;
        }
        // Check if dist exists
        const distExists = await fs_extra_1.default.pathExists(path_1.default.join(process.cwd(), 'dist'));
        if (!distExists) {
            spinner.warn(chalk_1.default.yellow('dist/ directory not found. Run build first.'));
        }
        spinner.succeed(chalk_1.default.green('Plugin validation passed!'));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Validation failed'));
        console.error(error);
    }
}
