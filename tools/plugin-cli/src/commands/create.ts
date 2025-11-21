import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { generatePluginTemplate, generateManifest } from '@summit/plugin-sdk';

export async function createPlugin(
  pluginName: string,
  options: { category?: string; author?: string; template?: string }
): Promise<void> {
  const spinner = ora('Creating plugin...').start();

  try {
    // Prompt for missing information
    const answers = await inquirer.prompt([
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
    const pluginDir = path.join(process.cwd(), pluginName);
    await fs.ensureDir(pluginDir);

    // Create directory structure
    await fs.ensureDir(path.join(pluginDir, 'src'));
    await fs.ensureDir(path.join(pluginDir, 'test'));
    await fs.ensureDir(path.join(pluginDir, 'dist'));

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
        '@summit/plugin-sdk': '^1.0.0',
      },
      devDependencies: {
        typescript: '^5.3.3',
        '@types/node': '^20.10.0',
      },
    };

    await fs.writeJson(path.join(pluginDir, 'package.json'), packageJson, { spaces: 2 });

    // Generate plugin manifest
    const manifest = generateManifest({
      id: pluginId,
      name: pluginName,
      version: '1.0.0',
      description: answers.description,
      author,
      category,
    });

    await fs.writeFile(path.join(pluginDir, 'plugin.json'), manifest);

    // Generate main plugin file
    const pluginCode = generatePluginTemplate({
      id: pluginId,
      name: pluginName,
      category,
      author,
    });

    await fs.writeFile(path.join(pluginDir, 'src', 'index.ts'), pluginCode);

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

    await fs.writeJson(path.join(pluginDir, 'tsconfig.json'), tsconfig, { spaces: 2 });

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

    await fs.writeFile(path.join(pluginDir, 'README.md'), readme);

    spinner.succeed(chalk.green('Plugin created successfully!'));

    console.log('\nNext steps:');
    console.log(chalk.cyan(`  cd ${pluginName}`));
    console.log(chalk.cyan('  npm install'));
    console.log(chalk.cyan('  npm run dev'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to create plugin'));
    console.error(error);
    throw error;
  }
}
