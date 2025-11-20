import { execa } from 'execa';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Executor provides utilities for running external commands and scripts
 */
export class Executor {
  constructor(output, config) {
    this.output = output;
    this.config = config;
    this.projectRoot = this.findProjectRoot();
  }

  /**
   * Find the project root directory (where package.json exists)
   */
  findProjectRoot() {
    // Assume CLI is in summit/summit-cli, so project root is one level up
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return join(__dirname, '../../..');
  }

  /**
   * Execute a command and stream output
   */
  async exec(command, args = [], options = {}) {
    this.output.debug(`Executing: ${command} ${args.join(' ')}`);

    const execOptions = {
      cwd: options.cwd || this.projectRoot,
      env: { ...process.env, ...options.env },
      stdio: this.output.format === 'human' ? 'inherit' : 'pipe',
      reject: false,
      ...options,
    };

    try {
      const result = await execa(command, args, execOptions);

      if (result.exitCode !== 0 && !options.ignoreExitCode) {
        throw new Error(
          `Command failed with exit code ${result.exitCode}: ${command} ${args.join(' ')}`
        );
      }

      return result;
    } catch (error) {
      if (error.killed) {
        throw new Error(`Command was killed: ${command} ${args.join(' ')}`);
      }
      throw error;
    }
  }

  /**
   * Execute a shell script
   */
  async execScript(scriptPath, args = [], options = {}) {
    const fullPath = join(this.projectRoot, scriptPath);
    return this.exec('bash', [fullPath, ...args], options);
  }

  /**
   * Execute a make target
   */
  async execMake(target, args = [], options = {}) {
    return this.exec('make', [target, ...args], options);
  }

  /**
   * Execute a just recipe
   */
  async execJust(recipe, args = [], options = {}) {
    return this.exec('just', [recipe, ...args], options);
  }

  /**
   * Execute an npm/pnpm script
   */
  async execNpm(script, args = [], options = {}) {
    // Detect if pnpm is available
    const packageManager = await this.detectPackageManager();
    return this.exec(packageManager, ['run', script, ...args], options);
  }

  /**
   * Execute docker compose command
   */
  async execCompose(command, args = [], options = {}) {
    const composeFile = options.composeFile || this.config.dev?.composeFile || './compose/docker-compose.yml';
    const profiles = options.profiles || this.config.dev?.profiles || ['default'];

    const composeArgs = [
      '-f',
      composeFile,
      ...profiles.flatMap((p) => ['--profile', p]),
      command,
      ...args,
    ];

    return this.exec('docker', ['compose', ...composeArgs], options);
  }

  /**
   * Detect package manager (pnpm or npm)
   */
  async detectPackageManager() {
    try {
      await execa('pnpm', ['--version'], { stdio: 'ignore' });
      return 'pnpm';
    } catch {
      return 'npm';
    }
  }

  /**
   * Check if a command is available
   */
  async commandExists(command) {
    try {
      await execa('which', [command], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get docker compose service status
   */
  async getComposeStatus(options = {}) {
    try {
      const result = await this.execCompose('ps', ['--format', 'json'], {
        ...options,
        stdio: 'pipe',
        ignoreExitCode: true,
      });

      if (result.stdout) {
        return JSON.parse(result.stdout);
      }
      return [];
    } catch (error) {
      this.output.debug(`Failed to get compose status: ${error.message}`);
      return [];
    }
  }
}
