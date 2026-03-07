import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ContainerRunRequest {
  imageName: string;
  command: string[];
  workspaceDir?: string;
  timeoutMs?: number;
}

export interface ContainerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtimeMs: number;
}

export interface ContainerRunnerOptions {
  dockerBinary?: string;
  allowedImagePrefixes?: string[];
}

export class ContainerRunner {
  private readonly dockerBinary: string;
  private readonly allowedImagePrefixes: string[];

  constructor(options: ContainerRunnerOptions = {}) {
    this.dockerBinary = options.dockerBinary ?? 'docker';
    this.allowedImagePrefixes = options.allowedImagePrefixes ?? [];
  }

  private assertImageAllowed(imageName: string): void {
    if (this.allowedImagePrefixes.length === 0) {
      return;
    }

    const allowed = this.allowedImagePrefixes.some((prefix) => imageName.startsWith(prefix));
    if (!allowed) {
      throw new Error(`Image ${imageName} is not allowed by policy`);
    }
  }

  async runContainer(request: ContainerRunRequest): Promise<ContainerRunResult> {
    if (!request.command.length) {
      throw new Error('Container command must include at least one argument');
    }

    this.assertImageAllowed(request.imageName);

    const dockerArgs = [
      'run',
      '--rm',
      '--network',
      'none',
      '--pull',
      'never',
      request.imageName,
      ...request.command,
    ];

    const start = Date.now();

    try {
      const { stdout, stderr } = await execFileAsync(this.dockerBinary, dockerArgs, {
        cwd: request.workspaceDir,
        timeout: request.timeoutMs ?? 300_000,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        stdout,
        stderr,
        exitCode: 0,
        runtimeMs: Date.now() - start,
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object') {
        const failure = error as {
          stdout?: string;
          stderr?: string;
          code?: number | string;
        };

        return {
          stdout: failure.stdout ?? '',
          stderr: failure.stderr ?? String(error),
          exitCode: typeof failure.code === 'number' ? failure.code : 1,
          runtimeMs: Date.now() - start,
        };
      }

      return {
        stdout: '',
        stderr: String(error),
        exitCode: 1,
        runtimeMs: Date.now() - start,
      };
    }
  }
}
