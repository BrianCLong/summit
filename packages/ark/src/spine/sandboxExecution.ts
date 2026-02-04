export type SandboxLanguage = 'javascript' | 'typescript' | 'python';

export interface SandboxExecutionRequest {
  sandboxId: string;
  code: string;
  language?: SandboxLanguage;
  entryPoint?: string;
  inputs?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface SandboxExecutionResult {
  executionId: string;
  status: 'success' | 'error' | 'timeout' | 'resource_exceeded' | 'blocked';
  output: unknown;
  logs: string[];
}

export interface SandboxExecutionBoundary {
  execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult>;
}

export interface SandboxExecutionClientOptions {
  baseUrl: string;
  allowedHosts?: string[];
  allowLoopback?: boolean;
  fetchFn?: typeof fetch;
}

export class SandboxExecutionClient implements SandboxExecutionBoundary {
  private baseUrl: string;
  private allowedHosts: string[];
  private allowLoopback: boolean;
  private fetchFn: typeof fetch;

  constructor(options: SandboxExecutionClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.allowedHosts = options.allowedHosts ?? [];
    this.allowLoopback = options.allowLoopback ?? false;
    this.fetchFn = options.fetchFn ?? fetch;
    this.assertTrustedEndpoint();
  }

  async execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/api/v1/sandboxes/${request.sandboxId}/execute`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Sandbox execution failed: ${response.status} ${message}`);
    }

    return response.json() as Promise<SandboxExecutionResult>;
  }

  private assertTrustedEndpoint(): void {
    const url = new URL(this.baseUrl);
    const host = url.hostname.toLowerCase();
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    if (!this.allowLoopback && isLoopback) {
      throw new Error('Sandbox endpoint must not be loopback without explicit allowLoopback');
    }

    if (this.allowedHosts.length > 0 && !this.allowedHosts.includes(host)) {
      throw new Error(`Sandbox endpoint host ${host} is not in the allowed host list`);
    }
  }
}
