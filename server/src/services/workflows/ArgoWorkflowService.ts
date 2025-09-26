import logger from '../../config/logger.js';

export interface WorkflowSubmissionResult {
  runId: string;
  status: 'DRY_RUN' | 'SUBMITTED';
  submittedAt: Date;
  workflow?: Record<string, unknown>;
}

export interface SubmitWorkflowOptions {
  runName?: string;
  variables?: Record<string, unknown>;
}

interface ServiceOptions {
  baseUrl?: string;
  namespace?: string;
  authToken?: string;
  fetchImpl?: typeof fetch;
}

const serviceLogger = logger.child({ name: 'ArgoWorkflowService' });

export class ArgoWorkflowService {
  private readonly baseUrl?: string;
  private readonly namespace: string;
  private readonly authToken?: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(options: ServiceOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/$/, '');
    this.namespace = options.namespace || 'argo';
    this.authToken = options.authToken;
    this.fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
  }

  async submitWorkflow(
    template: Record<string, unknown>,
    { runName, variables = {} }: SubmitWorkflowOptions = {},
  ): Promise<WorkflowSubmissionResult> {
    const submittedAt = new Date();

    if (!this.baseUrl) {
      serviceLogger.warn('Argo base URL not configured. Returning dry-run response.');
      return {
        runId: `dryrun-${submittedAt.getTime()}`,
        status: 'DRY_RUN',
        submittedAt,
        workflow: {
          template,
          variables,
        },
      };
    }

    if (!this.fetchImpl) {
      throw new Error('fetch implementation is not available in this runtime');
    }

    const workflowPayload = this.prepareWorkflowPayload(template, variables, runName);
    const namespace = (workflowPayload.metadata?.namespace as string) || this.namespace;

    const response = await this.fetchImpl(`${this.baseUrl}/api/v1/workflows/${namespace}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
      body: JSON.stringify({ workflow: workflowPayload }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      serviceLogger.error({ status: response.status, body: errorBody }, 'Argo workflow submission failed');
      throw new Error(`Failed to submit workflow to Argo (status ${response.status}): ${errorBody}`);
    }

    const payload = await response
      .json()
      .catch(() => ({ metadata: { name: `workflow-${submittedAt.getTime()}` } })) as Record<string, unknown>;

    const metadata = (payload.metadata as Record<string, unknown>) || {};
    const runId = (metadata.name as string) || (metadata.generateName as string) || `workflow-${submittedAt.getTime()}`;

    serviceLogger.info({ runId, namespace }, 'Argo workflow submitted');

    return {
      runId,
      status: 'SUBMITTED',
      submittedAt,
      workflow: payload,
    };
  }

  private prepareWorkflowPayload(
    template: Record<string, unknown>,
    variables: Record<string, unknown>,
    runName?: string,
  ): Record<string, unknown> {
    const payload = this.clone(template);
    const metadata = { ...(payload.metadata as Record<string, unknown> | undefined) };

    metadata.namespace = (metadata.namespace as string) || this.namespace;

    if (runName) {
      metadata.generateName = `${runName}-`;
      delete metadata.name;
    } else if (!metadata.name && !metadata.generateName) {
      metadata.generateName = 'workflow-';
    }

    payload.metadata = metadata;

    const spec = { ...(payload.spec as Record<string, unknown> | undefined) };
    const argumentsBlock = { ...(spec.arguments as Record<string, unknown> | undefined) };
    const existingParameters = Array.isArray(argumentsBlock.parameters)
      ? [...(argumentsBlock.parameters as any[])]
      : [];

    const mergedParameters = this.mergeParameters(existingParameters, variables);
    if (mergedParameters.length > 0) {
      argumentsBlock.parameters = mergedParameters;
    }

    spec.arguments = argumentsBlock;
    payload.spec = spec;

    return payload;
  }

  private mergeParameters(existing: any[], variables: Record<string, unknown>): any[] {
    const paramsByName = new Map<string, any>();

    for (const param of existing) {
      if (param?.name) {
        paramsByName.set(param.name, { ...param });
      }
    }

    for (const [name, value] of Object.entries(variables)) {
      paramsByName.set(name, {
        ...(paramsByName.get(name) || {}),
        name,
        value: this.serialiseValue(value),
      });
    }

    return Array.from(paramsByName.values());
  }

  private serialiseValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private clone<T>(value: T): T {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value));
    }
  }
}
