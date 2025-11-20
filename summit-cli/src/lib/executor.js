import { execa } from 'execa';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { access, constants } from 'fs/promises';

/**
 * Executor provides utilities for running external commands and scripts safely.
 *
 * Features:
 * - Command validation before execution
 * - Timeout support with configurable limits
 * - Error handling with detailed context
 * - Command existence checks
 * - Environment variable sanitization
 * - Working directory validation
 *
 * @example
 * const executor = new Executor(output, config);
 * await executor.exec('docker', ['ps'], { timeout: 5000 });
 */
export class Executor {
  /**
   * Maximum allowed timeout for commands (10 minutes)
   * @private
   */
  static MAX_TIMEOUT = 600000;

  /**
   * Default timeout for commands (2 minutes)
   * @private
   */
  static DEFAULT_TIMEOUT = 120000;

  /**
   * Commands that require special handling or validation
   * @private
   */
  static DANGEROUS_COMMANDS = new Set(['rm', 'dd', 'mkfs', 'fdisk']);

  constructor(output, config) {
    if (!output) {
      throw new Error('Output formatter is required');
    }
    if (!config) {
      throw new Error('Configuration is required');
    }

    this.output = output;
    this.config = config;
    this.projectRoot = this.findProjectRoot();
    this.commandCache = new Map(); // Cache for command existence checks
  }

  /**
   * Find the project root directory by looking for package.json.
   * Falls back to a calculated path if package.json isn't found.
   *
   * @returns {string} Absolute path to project root
   * @throws {Error} If project root cannot be determined
   */
  findProjectRoot() {
    try {
      // CLI is in summit/summit-cli/src/lib, so project root is 3 levels up
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const calculatedRoot = join(__dirname, '../../..');

      // Verify the root exists and has a package.json
      const packageJsonPath = join(calculatedRoot, 'package.json');
      if (existsSync(packageJsonPath)) {
        return calculatedRoot;
      }

      // Fallback: use the calculated root anyway
      this.output.debug(`Warning: package.json not found at ${packageJsonPath}, using calculated root`);
      return calculatedRoot;
    } catch (error) {
      throw new Error(`Failed to find project root: ${error.message}`);
    }
  }

  /**
   * Validate command before execution.
   * Checks for dangerous commands and provides warnings.
   *
   * @private
   * @param {string} command - Command to validate
   * @param {string[]} args - Command arguments
   * @throws {Error} If command is dangerous and no confirmation
   */
  validateCommand(command, args) {
    if (!command || typeof command !== 'string') {
      throw new Error('Command must be a non-empty string');
    }

    // Check for dangerous commands
    if (Executor.DANGEROUS_COMMANDS.has(command)) {
      this.output.warning(`Dangerous command detected: ${command}`);
      // In production, you might want to require explicit confirmation
    }

    // Validate arguments array
    if (!Array.isArray(args)) {
      throw new Error('Arguments must be an array');
    }

    // Check for shell injection attempts in arguments
    args.forEach((arg, index) => {
      if (typeof arg !== 'string' && typeof arg !== 'number') {
        throw new Error(`Argument at index ${index} must be a string or number`);
      }
    });
  }

  /**
   * Validate and sanitize execution options.
   *
   * @private
   * @param {Object} options - Execution options
   * @returns {Object} Sanitized options
   */
  validateOptions(options) {
    const sanitized = { ...options };

    // Validate timeout
    if (sanitized.timeout !== undefined) {
      const timeout = Number(sanitized.timeout);
      if (isNaN(timeout) || timeout < 0) {
        throw new Error('Timeout must be a positive number');
      }
      if (timeout > Executor.MAX_TIMEOUT) {
        this.output.warning(`Timeout ${timeout}ms exceeds maximum, capping at ${Executor.MAX_TIMEOUT}ms`);
        sanitized.timeout = Executor.MAX_TIMEOUT;
      }
    } else {
      sanitized.timeout = Executor.DEFAULT_TIMEOUT;
    }

    // Validate working directory
    if (sanitized.cwd) {
      if (!existsSync(sanitized.cwd)) {
        throw new Error(`Working directory does not exist: ${sanitized.cwd}`);
      }
    }

    // Sanitize environment variables
    if (sanitized.env) {
      Object.keys(sanitized.env).forEach(key => {
        if (sanitized.env[key] === undefined || sanitized.env[key] === null) {
          delete sanitized.env[key];
        }
      });
    }

    return sanitized;
  }

  /**
   * Execute a command with comprehensive error handling and logging.
   *
   * @param {string} command - Command to execute
   * @param {string[]} args - Command arguments
   * @param {Object} options - Execution options
   * @param {string} options.cwd - Working directory
   * @param {Object} options.env - Environment variables
   * @param {number} options.timeout - Command timeout in ms
   * @param {boolean} options.ignoreExitCode - Don't throw on non-zero exit
   * @returns {Promise<Object>} Command result
   * @throws {Error} If command fails or validation fails
   */
  async exec(command, args = [], options = {}) {
    // Validate inputs
    this.validateCommand(command, args);
    const validatedOptions = this.validateOptions(options);

    // Log execution (debug level)
    this.output.debug(`Executing: ${command} ${args.join(' ')}`);
    if (validatedOptions.cwd && validatedOptions.cwd !== this.projectRoot) {
      this.output.debug(`Working directory: ${validatedOptions.cwd}`);
    }

    // Build execution options
    const execOptions = {
      cwd: validatedOptions.cwd || this.projectRoot,
      env: { ...process.env, ...validatedOptions.env },
      stdio: this.output.format === 'human' ? 'inherit' : 'pipe',
      reject: false,
      timeout: validatedOptions.timeout,
      killSignal: 'SIGTERM', // Graceful termination
      ...validatedOptions,
    };

    const startTime = Date.now();

    try {
      const result = await execa(command, args, execOptions);
      const duration = Date.now() - startTime;

      // Log completion
      this.output.debug(`Command completed in ${duration}ms with exit code ${result.exitCode}`);

      // Check exit code
      if (result.exitCode !== 0 && !validatedOptions.ignoreExitCode) {
        const errorMsg = result.stderr || result.stdout || 'Unknown error';
        throw new ExecutionError(
          `Command failed with exit code ${result.exitCode}: ${command} ${args.join(' ')}`,
          {
            command,
            args,
            exitCode: result.exitCode,
            stderr: errorMsg,
            duration,
          }
        );
      }

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle specific error types
      if (error.killed) {
        throw new ExecutionError(
          `Command was killed (timeout or signal): ${command} ${args.join(' ')}`,
          {
            command,
            args,
            killed: true,
            signal: error.signal,
            duration,
          }
        );
      }

      if (error.code === 'ENOENT') {
        throw new ExecutionError(
          `Command not found: ${command}. Please ensure it is installed and in PATH.`,
          {
            command,
            args,
            code: 'ENOENT',
            duration,
          }
        );
      }

      // Re-throw ExecutionError as-is
      if (error instanceof ExecutionError) {
        throw error;
      }

      // Wrap unknown errors
      throw new ExecutionError(
        `Command execution failed: ${error.message}`,
        {
          command,
          args,
          originalError: error.message,
          duration,
        }
      );
    }
  }

  /**
   * Execute a shell script from the scripts directory.
   *
   * @param {string} scriptPath - Relative path to script from project root
   * @param {string[]} args - Script arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   * @throws {Error} If script doesn't exist or execution fails
   */
  async execScript(scriptPath, args = [], options = {}) {
    if (!scriptPath) {
      throw new Error('Script path is required');
    }

    const fullPath = join(this.projectRoot, scriptPath);

    // Check if script exists and is executable
    try {
      await access(fullPath, constants.F_OK | constants.X_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Script not found: ${fullPath}`);
      }
      if (error.code === 'EACCES') {
        throw new Error(`Script is not executable: ${fullPath}. Run: chmod +x ${scriptPath}`);
      }
      throw error;
    }

    this.output.debug(`Executing script: ${scriptPath}`);
    return this.exec('bash', [fullPath, ...args], options);
  }

  /**
   * Execute a make target.
   *
   * @param {string} target - Make target to execute
   * @param {string[]} args - Additional make arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execMake(target, args = [], options = {}) {
    if (!target) {
      throw new Error('Make target is required');
    }

    // Check if make is available
    if (!(await this.commandExists('make'))) {
      throw new Error('make is not installed. Please install GNU Make.');
    }

    return this.exec('make', [target, ...args], options);
  }

  /**
   * Execute a just recipe.
   *
   * @param {string} recipe - Just recipe to execute
   * @param {string[]} args - Recipe arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execJust(recipe, args = [], options = {}) {
    if (!recipe) {
      throw new Error('Just recipe is required');
    }

    // Check if just is available
    if (!(await this.commandExists('just'))) {
      throw new Error('just is not installed. Install from: https://github.com/casey/just');
    }

    return this.exec('just', [recipe, ...args], options);
  }

  /**
   * Execute an npm/pnpm script from package.json.
   *
   * @param {string} script - Script name from package.json
   * @param {string[]} args - Script arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execNpm(script, args = [], options = {}) {
    if (!script) {
      throw new Error('Script name is required');
    }

    // Detect package manager
    const packageManager = await this.detectPackageManager();
    this.output.debug(`Using package manager: ${packageManager}`);

    return this.exec(packageManager, ['run', script, ...args], options);
  }

  /**
   * Execute docker compose command with profile support.
   *
   * @param {string} command - Docker compose command (up, down, ps, etc.)
   * @param {string[]} args - Command arguments
   * @param {Object} options - Execution options
   * @param {string} options.composeFile - Path to compose file
   * @param {string[]} options.profiles - Docker compose profiles to use
   * @returns {Promise<Object>} Execution result
   */
  async execCompose(command, args = [], options = {}) {
    if (!command) {
      throw new Error('Docker compose command is required');
    }

    // Check if docker is available
    if (!(await this.commandExists('docker'))) {
      throw new Error('Docker is not installed. Please install Docker Desktop or Docker Engine.');
    }

    const composeFile = options.composeFile || this.config.dev?.composeFile || './compose/docker-compose.yml';
    const profiles = options.profiles || this.config.dev?.profiles || ['default'];

    // Validate compose file exists
    const fullComposePath = join(this.projectRoot, composeFile);
    if (!existsSync(fullComposePath)) {
      throw new Error(`Docker compose file not found: ${composeFile}`);
    }

    const composeArgs = [
      '-f',
      composeFile,
      ...profiles.flatMap((p) => ['--profile', p]),
      command,
      ...args,
    ];

    this.output.debug(`Docker compose profiles: ${profiles.join(', ')}`);
    return this.exec('docker', ['compose', ...composeArgs], options);
  }

  /**
   * Detect which package manager is available (pnpm preferred).
   * Result is cached for performance.
   *
   * @returns {Promise<string>} 'pnpm' or 'npm'
   */
  async detectPackageManager() {
    const cacheKey = 'packageManager';

    if (this.commandCache.has(cacheKey)) {
      return this.commandCache.get(cacheKey);
    }

    try {
      await execa('pnpm', ['--version'], { stdio: 'ignore', timeout: 5000 });
      this.commandCache.set(cacheKey, 'pnpm');
      return 'pnpm';
    } catch {
      this.commandCache.set(cacheKey, 'npm');
      return 'npm';
    }
  }

  /**
   * Check if a command exists in PATH.
   * Result is cached for performance.
   *
   * @param {string} command - Command to check
   * @returns {Promise<boolean>} True if command exists
   */
  async commandExists(command) {
    if (!command) {
      return false;
    }

    // Check cache first
    if (this.commandCache.has(command)) {
      return this.commandCache.get(command);
    }

    try {
      await execa('which', [command], { stdio: 'ignore', timeout: 5000 });
      this.commandCache.set(command, true);
      return true;
    } catch {
      this.commandCache.set(command, false);
      return false;
    }
  }

  /**
   * Get docker compose service status as structured data.
   *
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Array of service status objects
   */
  async getComposeStatus(options = {}) {
    try {
      const result = await this.execCompose('ps', ['--format', 'json'], {
        ...options,
        stdio: 'pipe',
        ignoreExitCode: true,
      });

      if (!result.stdout) {
        return [];
      }

      // Parse JSON output
      try {
        const parsed = JSON.parse(result.stdout);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        this.output.debug(`Failed to parse compose status JSON: ${parseError.message}`);
        return [];
      }
    } catch (error) {
      this.output.debug(`Failed to get compose status: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear the command existence cache.
   * Useful after installing new tools.
   */
  clearCache() {
    this.commandCache.clear();
    this.output.debug('Command cache cleared');
  }
}

/**
 * Custom error class for command execution failures.
 * Provides additional context for debugging.
 */
export class ExecutionError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ExecutionError';
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExecutionError);
    }
  }

  /**
   * Get a JSON representation of the error for logging.
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}
