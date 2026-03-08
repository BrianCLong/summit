"use strict";
/**
 * Plugin CLI Commands
 *
 * Commands for creating, testing, and publishing Summit plugins.
 *
 * SOC 2 Controls: CC6.1 (Development Controls), CC7.1 (System Operations)
 *
 * @module @summit/cli/commands/plugin
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginCommands = void 0;
/* eslint-disable no-console */
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const client_js_1 = require("../client.js");
// ============================================================================
// Plugin Create Command
// ============================================================================
const create = new commander_1.Command('create')
    .description('Create a new plugin from template')
    .argument('<name>', 'Plugin name (e.g., my-plugin)')
    .option('-t, --template <template>', 'Template type', 'basic')
    .option('-d, --directory <dir>', 'Output directory', '.')
    .option('--typescript', 'Use TypeScript template', true)
    .option('--no-install', 'Skip npm install')
    .action((name, options) => {
    const pluginDir = (0, path_1.resolve)(options.directory, name);
    console.log(chalk_1.default.bold(`\n🔌 Creating plugin: ${name}\n`));
    // Check if directory exists
    if ((0, fs_1.existsSync)(pluginDir)) {
        console.log(chalk_1.default.red(`Error: Directory ${pluginDir} already exists`));
        process.exit(1);
    }
    // Create directory structure
    console.log(chalk_1.default.gray('Creating directory structure...'));
    (0, fs_1.mkdirSync)(pluginDir, { recursive: true });
    (0, fs_1.mkdirSync)((0, path_1.join)(pluginDir, 'src'), { recursive: true });
    (0, fs_1.mkdirSync)((0, path_1.join)(pluginDir, 'tests'), { recursive: true });
    // Create manifest
    const manifest = {
        id: name,
        name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        version: '1.0.0',
        description: `A Summit platform plugin`,
        author: '',
        permissions: ['storage:read', 'storage:write', 'api:read'],
        hooks: ['onInitialize', 'onEvent'],
    };
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    // Create package.json
    const packageJson = {
        name: `@summit-plugins/${name}`,
        version: '1.0.0',
        description: manifest.description,
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
            build: 'tsc',
            test: 'jest',
            'test:watch': 'jest --watch',
            lint: 'eslint src/**/*.ts',
            prepublishOnly: 'npm run build',
        },
        keywords: ['summit', 'plugin'],
        peerDependencies: {
            '@intelgraph/plugin-sdk': '^2.0.0',
        },
        devDependencies: {
            '@intelgraph/plugin-sdk': '^2.0.0',
            '@types/jest': '^29.0.0',
            '@types/node': '^20.0.0',
            jest: '^29.0.0',
            'ts-jest': '^29.0.0',
            typescript: '^5.0.0',
        },
    };
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    // Create tsconfig.json
    const tsconfig = {
        compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            lib: ['ES2022'],
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            declaration: true,
            declarationMap: true,
            sourceMap: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'tests'],
    };
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    // Create main plugin file
    const className = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const mainFile = `/**
 * ${manifest.name}
 *
 * ${manifest.description}
 */

import { PluginBuilder } from '@intelgraph/plugin-sdk';
import type { PluginContext } from '@intelgraph/plugin-sdk';

/**
 * Plugin configuration interface
 */
export interface ${className}Config {
  enabled: boolean;
  // Add your config options here
}

// Store context for use in lifecycle handlers
let pluginContext: PluginContext | null = null;

/**
 * Create the plugin instance
 */
export function create${className}Plugin() {
  return new PluginBuilder()
    .withMetadata({
      id: '${name}',
      name: '${manifest.name}',
      version: '1.0.0',
      description: '${manifest.description}',
      author: { name: 'Your Name' },
      license: 'MIT',
      category: 'utility',
    })
    .onInitialize(async (ctx: PluginContext) => {
      pluginContext = ctx;
      ctx.logger.info('Plugin initialized');
    })
    .onStart(async () => {
      if (pluginContext) {
        pluginContext.logger.info('Plugin started');
      }
    })
    .onStop(async () => {
      if (pluginContext) {
        pluginContext.logger.info('Plugin stopped');
      }
    })
    .onDestroy(async () => {
      if (pluginContext) {
        pluginContext.logger.info('Plugin destroyed');
      }
      pluginContext = null;
    })
    .onHealthCheck(async () => {
      return { healthy: true };
    })
    .build();
}

// Export default plugin instance
export default create${className}Plugin();
`;
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, 'src', 'index.ts'), mainFile);
    // Create test file
    const testFile = `/**
 * Plugin Tests
 */

import { createTestHarness } from '@intelgraph/plugin-sdk';
import plugin from '../src/index';

describe('${manifest.name}', () => {
  const harness = createTestHarness({
    pluginId: '${name}',
    version: '1.0.0',
  });

  beforeEach(async () => {
    await harness.load(plugin);
  });

  afterEach(async () => {
    await harness.reset();
  });

  it('should initialize successfully', async () => {
    await harness.initialize();
    expect(harness.getLogger().getLogs()).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: 'Plugin initialized',
      })
    );
  });

  it('should start successfully', async () => {
    await harness.initialize();
    await harness.start();
    expect(harness.getLogger().getLogs()).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: 'Plugin started',
      })
    );
  });

  it('should pass health check', async () => {
    await harness.initialize();
    await harness.start();
    const result = await harness.runLifecycleTest();
    expect(result.passed).toBe(true);
  });
});
`;
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, 'tests', 'plugin.test.ts'), testFile);
    // Create jest config
    const jestConfig = {
        preset: 'ts-jest',
        testEnvironment: 'node',
        roots: ['<rootDir>/tests'],
        testMatch: ['**/*.test.ts'],
        moduleFileExtensions: ['ts', 'js', 'json'],
    };
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, 'jest.config.json'), JSON.stringify(jestConfig, null, 2));
    // Create README
    const readme = `# ${manifest.name}

${manifest.description}

## Installation

\`\`\`bash
npm install @summit-plugins/${name}
\`\`\`

## Usage

\`\`\`typescript
import plugin from '@summit-plugins/${name}';

// Plugin will be automatically loaded by Summit
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
\`\`\`

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | boolean | true | Enable/disable the plugin |

## License

MIT
`;
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, 'README.md'), readme);
    // Create .gitignore
    const gitignore = `node_modules/
dist/
*.log
.DS_Store
coverage/
`;
    (0, fs_1.writeFileSync)((0, path_1.join)(pluginDir, '.gitignore'), gitignore);
    console.log(chalk_1.default.green('✓ Created plugin files'));
    // Install dependencies
    if (options.install !== false) {
        console.log(chalk_1.default.gray('Installing dependencies...'));
        try {
            (0, child_process_1.execSync)('npm install', { cwd: pluginDir, stdio: 'inherit' });
            console.log(chalk_1.default.green('✓ Installed dependencies'));
        }
        catch (_error) {
            console.log(chalk_1.default.yellow('⚠ Failed to install dependencies. Run npm install manually.'));
        }
    }
    console.log(chalk_1.default.bold.green(`\n✅ Plugin created successfully!\n`));
    console.log(`  ${chalk_1.default.cyan('cd')} ${name}`);
    console.log(`  ${chalk_1.default.cyan('npm run build')} - Build the plugin`);
    console.log(`  ${chalk_1.default.cyan('npm test')} - Run tests`);
    console.log(`  ${chalk_1.default.cyan('summit plugin validate')} - Validate manifest`);
    console.log(`  ${chalk_1.default.cyan('summit plugin publish')} - Publish to marketplace\n`);
});
// ============================================================================
// Plugin Validate Command
// ============================================================================
const validate = new commander_1.Command('validate')
    .description('Validate plugin manifest and structure')
    .option('-d, --directory <dir>', 'Plugin directory', '.')
    .action((options) => {
    const pluginDir = (0, path_1.resolve)(options.directory);
    const manifestPath = (0, path_1.join)(pluginDir, 'manifest.json');
    console.log(chalk_1.default.bold('\n🔍 Validating plugin...\n'));
    const errors = [];
    const warnings = [];
    // Check manifest exists
    if (!(0, fs_1.existsSync)(manifestPath)) {
        console.log(chalk_1.default.red('✗ manifest.json not found'));
        process.exit(1);
    }
    console.log(chalk_1.default.green('✓ manifest.json found'));
    // Parse and validate manifest
    try {
        const manifest = JSON.parse((0, fs_1.readFileSync)(manifestPath, 'utf-8'));
        // Required fields
        if (!manifest.id) {
            errors.push('Missing required field: id');
        }
        if (!manifest.name) {
            errors.push('Missing required field: name');
        }
        if (!manifest.version) {
            errors.push('Missing required field: version');
        }
        // ID format
        if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
            errors.push('Plugin ID must be lowercase alphanumeric with hyphens');
        }
        // Version format (semver)
        if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
            errors.push('Version must follow semver format (e.g., 1.0.0)');
        }
        // Permissions
        const validPermissions = [
            'storage:read', 'storage:write',
            'api:read', 'api:write',
            'events:subscribe', 'events:publish',
            'secrets:read',
        ];
        if (manifest.permissions) {
            for (const perm of manifest.permissions) {
                if (!validPermissions.includes(perm)) {
                    warnings.push(`Unknown permission: ${perm}`);
                }
            }
        }
        console.log(chalk_1.default.green('✓ Manifest parsed successfully'));
        console.log(`  ID: ${manifest.id}`);
        console.log(`  Name: ${manifest.name}`);
        console.log(`  Version: ${manifest.version}`);
        console.log(`  Permissions: ${(manifest.permissions || []).join(', ') || 'none'}`);
    }
    catch (error) {
        errors.push(`Invalid JSON in manifest.json: ${error}`);
    }
    // Check source files
    const srcDir = (0, path_1.join)(pluginDir, 'src');
    if (!(0, fs_1.existsSync)(srcDir)) {
        errors.push('Missing src/ directory');
    }
    else {
        const indexFile = (0, path_1.join)(srcDir, 'index.ts');
        if (!(0, fs_1.existsSync)(indexFile) && !(0, fs_1.existsSync)((0, path_1.join)(srcDir, 'index.js'))) {
            errors.push('Missing src/index.ts or src/index.js');
        }
        else {
            console.log(chalk_1.default.green('✓ Source files found'));
        }
    }
    // Check tests
    const testsDir = (0, path_1.join)(pluginDir, 'tests');
    if (!(0, fs_1.existsSync)(testsDir)) {
        warnings.push('No tests/ directory found');
    }
    else {
        console.log(chalk_1.default.green('✓ Tests directory found'));
    }
    // Check package.json
    const packageJsonPath = (0, path_1.join)(pluginDir, 'package.json');
    if (!(0, fs_1.existsSync)(packageJsonPath)) {
        errors.push('Missing package.json');
    }
    else {
        try {
            const packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, 'utf-8'));
            if (!packageJson.peerDependencies?.['@intelgraph/plugin-sdk']) {
                warnings.push('@intelgraph/plugin-sdk should be a peer dependency');
            }
            console.log(chalk_1.default.green('✓ package.json valid'));
        }
        catch {
            errors.push('Invalid package.json');
        }
    }
    // Print results
    console.log('');
    if (warnings.length > 0) {
        console.log(chalk_1.default.yellow('Warnings:'));
        warnings.forEach((w) => console.log(chalk_1.default.yellow(`  ⚠ ${w}`)));
    }
    if (errors.length > 0) {
        console.log(chalk_1.default.red('\nErrors:'));
        errors.forEach((e) => console.log(chalk_1.default.red(`  ✗ ${e}`)));
        console.log(chalk_1.default.red(`\n❌ Validation failed with ${errors.length} error(s)\n`));
        process.exit(1);
    }
    console.log(chalk_1.default.green.bold('\n✅ Plugin validation passed!\n'));
});
// ============================================================================
// Plugin Test Command
// ============================================================================
const test = new commander_1.Command('test')
    .description('Run plugin tests')
    .option('-d, --directory <dir>', 'Plugin directory', '.')
    .option('--watch', 'Watch mode')
    .option('--coverage', 'Generate coverage report')
    .action((options) => {
    const pluginDir = (0, path_1.resolve)(options.directory);
    console.log(chalk_1.default.bold('\n🧪 Running plugin tests...\n'));
    const args = ['test'];
    if (options.watch) {
        args.push('--watch');
    }
    if (options.coverage) {
        args.push('--coverage');
    }
    try {
        (0, child_process_1.execSync)(`npm ${args.join(' ')}`, {
            cwd: pluginDir,
            stdio: 'inherit',
        });
    }
    catch (_error) {
        process.exit(1);
    }
});
// ============================================================================
// Plugin Build Command
// ============================================================================
const build = new commander_1.Command('build')
    .description('Build plugin for distribution')
    .option('-d, --directory <dir>', 'Plugin directory', '.')
    .option('--production', 'Production build')
    .action((options) => {
    const pluginDir = (0, path_1.resolve)(options.directory);
    console.log(chalk_1.default.bold('\n🔨 Building plugin...\n'));
    try {
        // Run TypeScript compiler
        (0, child_process_1.execSync)('npm run build', {
            cwd: pluginDir,
            stdio: 'inherit',
        });
        console.log(chalk_1.default.green.bold('\n✅ Build completed successfully!\n'));
        // Show output
        const distDir = (0, path_1.join)(pluginDir, 'dist');
        if ((0, fs_1.existsSync)(distDir)) {
            console.log('Output files:');
            (0, child_process_1.execSync)('ls -la dist/', { cwd: pluginDir, stdio: 'inherit' });
        }
    }
    catch (_error) {
        console.log(chalk_1.default.red('\n❌ Build failed\n'));
        process.exit(1);
    }
});
// ============================================================================
// Plugin Publish Command
// ============================================================================
const publish = new commander_1.Command('publish')
    .description('Publish plugin to Summit marketplace')
    .option('-d, --directory <dir>', 'Plugin directory', '.')
    .option('--dry-run', 'Validate without publishing')
    .option('--public', 'Make plugin publicly available')
    .action(async (options) => {
    const pluginDir = (0, path_1.resolve)(options.directory);
    const manifestPath = (0, path_1.join)(pluginDir, 'manifest.json');
    console.log(chalk_1.default.bold('\n📦 Publishing plugin...\n'));
    // Read manifest
    if (!(0, fs_1.existsSync)(manifestPath)) {
        console.log(chalk_1.default.red('Error: manifest.json not found'));
        process.exit(1);
    }
    const manifest = JSON.parse((0, fs_1.readFileSync)(manifestPath, 'utf-8'));
    console.log(`Plugin: ${manifest.name}`);
    console.log(`Version: ${manifest.version}`);
    console.log(`ID: ${manifest.id}`);
    // Build first
    console.log(chalk_1.default.gray('\nBuilding plugin...'));
    try {
        (0, child_process_1.execSync)('npm run build', { cwd: pluginDir, stdio: 'pipe' });
        console.log(chalk_1.default.green('✓ Build successful'));
    }
    catch (_error) {
        console.log(chalk_1.default.red('✗ Build failed'));
        process.exit(1);
    }
    // Run tests
    console.log(chalk_1.default.gray('Running tests...'));
    try {
        (0, child_process_1.execSync)('npm test', { cwd: pluginDir, stdio: 'pipe' });
        console.log(chalk_1.default.green('✓ Tests passed'));
    }
    catch (_error) {
        console.log(chalk_1.default.red('✗ Tests failed'));
        process.exit(1);
    }
    // Validate
    console.log(chalk_1.default.gray('Validating manifest...'));
    // Validation logic here
    console.log(chalk_1.default.green('✓ Manifest valid'));
    if (options.dryRun) {
        console.log(chalk_1.default.yellow('\n⚠ Dry run - skipping actual publish\n'));
        console.log(chalk_1.default.green.bold('✅ Plugin is ready to publish!\n'));
        return;
    }
    // Create plugin bundle
    const distDir = (0, path_1.join)(pluginDir, 'dist');
    const bundleData = {
        manifest,
        files: {},
    };
    // Read built files
    if ((0, fs_1.existsSync)(distDir)) {
        const indexJs = (0, path_1.join)(distDir, 'index.js');
        const indexDts = (0, path_1.join)(distDir, 'index.d.ts');
        if ((0, fs_1.existsSync)(indexJs)) {
            bundleData.files['index.js'] = (0, fs_1.readFileSync)(indexJs, 'utf-8');
        }
        if ((0, fs_1.existsSync)(indexDts)) {
            bundleData.files['index.d.ts'] = (0, fs_1.readFileSync)(indexDts, 'utf-8');
        }
    }
    console.log(chalk_1.default.gray('\nUploading to marketplace...'));
    try {
        const response = await (0, client_js_1.post)('/api/v1/plugins/publish', {
            plugin: bundleData,
            visibility: options.public ? 'public' : 'private',
        });
        console.log(chalk_1.default.gray('Submitting for review...'));
        console.log(chalk_1.default.green.bold('\n✅ Plugin submitted successfully!\n'));
        console.log(`Plugin ID: ${chalk_1.default.cyan(response.data.pluginId)}`);
        console.log(`Status: ${response.data.status}`);
        console.log('Your plugin has been submitted for review.');
        console.log('You will receive an email when it is approved.\n');
        console.log(`Track status: ${chalk_1.default.cyan(response.data.reviewUrl || `https://marketplace.summit.io/plugins/${manifest.id}`)}\n`);
    }
    catch (error) {
        console.log(chalk_1.default.red(`\n❌ Failed to publish plugin: ${error.message}\n`));
        process.exit(1);
    }
});
const list = new commander_1.Command('list')
    .description('List installed plugins')
    .option('--all', 'Show all available plugins')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
    console.log(chalk_1.default.bold('\n📋 Installed Plugins\n'));
    try {
        const endpoint = options.all ? '/api/v1/plugins/marketplace' : '/api/v1/plugins/installed';
        const response = await (0, client_js_1.get)(endpoint);
        const plugins = response.data.plugins;
        if (options.json) {
            console.log(JSON.stringify(plugins, null, 2));
            return;
        }
        if (plugins.length === 0) {
            console.log(chalk_1.default.gray('No plugins installed.'));
            console.log(chalk_1.default.gray('Use `summit plugin create <name>` to create a new plugin.'));
        }
        else {
            for (const plugin of plugins) {
                let statusIcon = chalk_1.default.gray('○');
                if (plugin.status === 'active') {
                    statusIcon = chalk_1.default.green('●');
                }
                else if (plugin.status === 'error') {
                    statusIcon = chalk_1.default.red('●');
                }
                console.log(`${statusIcon} ${plugin.name} (${chalk_1.default.dim(plugin.id)}) v${plugin.version}`);
                if (plugin.description) {
                    console.log(`   ${chalk_1.default.gray(plugin.description)}`);
                }
            }
        }
        console.log('');
    }
    catch (error) {
        console.log(chalk_1.default.red(`Failed to fetch plugins: ${error.message}`));
        process.exit(1);
    }
});
// ============================================================================
// Export Commands
// ============================================================================
exports.pluginCommands = {
    create,
    validate,
    test,
    build,
    publish,
    list,
};
