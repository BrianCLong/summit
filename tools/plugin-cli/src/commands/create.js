"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = createPlugin;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const plugin_sdk_1 = require("@intelgraph/plugin-sdk");
async function createPlugin(pluginName, options) {
    const spinner = (0, ora_1.default)('Creating plugin...').start();
    try {
        // Prompt for missing information
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'description',
                message: 'Plugin description:',
                default: 'A Summit platform plugin',
            },
            {
                type: 'list',
                name: 'category',
                message: 'Plugin category:',
                choices: [
                    'data-source',
                    'analyzer',
                    'visualization',
                    'export',
                    'authentication',
                    'search',
                    'ml-model',
                    'workflow',
                    'ui-theme',
                    'api-extension',
                    'integration',
                    'utility',
                ],
                when: !options.category,
            },
            {
                type: 'input',
                name: 'author',
                message: 'Author name:',
                when: !options.author,
            },
        ]);
        const pluginId = pluginName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const category = options.category || answers.category;
        const author = options.author || answers.author;
        // Create plugin directory
        const pluginDir = path_1.default.join(process.cwd(), pluginName);
        await fs_extra_1.default.ensureDir(pluginDir);
        // Create directory structure
        await fs_extra_1.default.ensureDir(path_1.default.join(pluginDir, 'src'));
        await fs_extra_1.default.ensureDir(path_1.default.join(pluginDir, 'test'));
        await fs_extra_1.default.ensureDir(path_1.default.join(pluginDir, 'dist'));
        // Generate package.json
        const packageJson = {
            name: `@summit-plugins/${pluginId}`,
            version: '1.0.0',
            description: answers.description,
            main: 'dist/index.js',
            type: 'module',
            scripts: {
                build: 'tsc',
                dev: 'tsc --watch',
                test: 'jest',
                validate: 'summit-plugin validate',
                publish: 'summit-plugin publish',
            },
            dependencies: {
                '@intelgraph/plugin-sdk': '^1.0.0',
            },
            devDependencies: {
                typescript: '^5.3.3',
                '@types/node': '^20.10.0',
            },
        };
        await fs_extra_1.default.writeJson(path_1.default.join(pluginDir, 'package.json'), packageJson, { spaces: 2 });
        // Generate plugin manifest
        const manifest = (0, plugin_sdk_1.generateManifest)({
            id: pluginId,
            name: pluginName,
            version: '1.0.0',
            description: answers.description,
            author,
            category,
        });
        await fs_extra_1.default.writeFile(path_1.default.join(pluginDir, 'plugin.json'), manifest);
        // Generate main plugin file
        const pluginCode = (0, plugin_sdk_1.generatePluginTemplate)({
            id: pluginId,
            name: pluginName,
            category,
            author,
        });
        await fs_extra_1.default.writeFile(path_1.default.join(pluginDir, 'src', 'index.ts'), pluginCode);
        // Generate tsconfig.json
        const tsconfig = {
            compilerOptions: {
                target: 'ES2022',
                module: 'ESNext',
                lib: ['ES2022'],
                moduleResolution: 'node',
                outDir: './dist',
                rootDir: './src',
                declaration: true,
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist', 'test'],
        };
        await fs_extra_1.default.writeJson(path_1.default.join(pluginDir, 'tsconfig.json'), tsconfig, { spaces: 2 });
        // Generate README
        const readme = `# ${pluginName}

${answers.description}

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm run test
\`\`\`

## Publish

\`\`\`bash
npm run publish
\`\`\`

## License

MIT
`;
        await fs_extra_1.default.writeFile(path_1.default.join(pluginDir, 'README.md'), readme);
        spinner.succeed(chalk_1.default.green('Plugin created successfully!'));
        console.log('\nNext steps:');
        console.log(chalk_1.default.cyan(`  cd ${pluginName}`));
        console.log(chalk_1.default.cyan('  npm install'));
        console.log(chalk_1.default.cyan('  npm run dev'));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to create plugin'));
        console.error(error);
        throw error;
    }
}
