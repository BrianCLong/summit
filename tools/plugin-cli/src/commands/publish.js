"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishPlugin = publishPlugin;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
async function publishPlugin(options) {
    const spinner = (0, ora_1.default)('Publishing plugin...').start();
    try {
        const registryUrl = options.registry || process.env.SUMMIT_REGISTRY_URL || 'http://localhost:3001';
        // Read manifest
        const manifest = await fs_extra_1.default.readJson(path_1.default.join(process.cwd(), 'plugin.json'));
        // Check if built
        const distExists = await fs_extra_1.default.pathExists(path_1.default.join(process.cwd(), 'dist'));
        if (!distExists) {
            spinner.fail(chalk_1.default.red('Plugin not built. Run build first.'));
            return;
        }
        if (options.dryRun) {
            spinner.info(chalk_1.default.blue('Dry run - would publish:'));
            console.log(JSON.stringify(manifest, null, 2));
            return;
        }
        // Package plugin
        spinner.text = 'Packaging plugin...';
        // In real implementation, would create tarball
        // Upload to registry
        spinner.text = 'Uploading to registry...';
        const response = await fetch(`${registryUrl}/api/plugins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                manifest,
                packageUrl: 'https://example.com/plugins/package.tar.gz', // Would be actual URL
            }),
        });
        if (!response.ok) {
            throw new Error(`Registry returned ${response.status}: ${await response.text()}`);
        }
        spinner.succeed(chalk_1.default.green(`Plugin ${manifest.id}@${manifest.version} published successfully!`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Publish failed'));
        console.error(error);
    }
}
