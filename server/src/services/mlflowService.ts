import fetch, { RequestInit } from 'node-fetch';
import { BatchV1Api, KubeConfig, V1EnvVar, V1Job } from '@kubernetes/client-node';
import logger from '../config/logger.js';

type MlflowModelVersion = {
  name: string;
  version: string;
  status: string;
  source?: string;
  run_id?: string;
  description?: string;
  creation_timestamp?: string | number;
  last_updated_timestamp?: string | number;
};

type MlflowRunData = {
  params?: Array<{ key: string; value: string }>;
  metrics?: Array<{ key: string; value: number }>;
  tags?: Array<{ key: string; value: string }>;
};

type ModelVersionSummary = {
  name: string;
  version: string;
  status: string;
  source?: string;
  runId?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  params: Record<string, string>;
  metrics: Record<string, number>;
  tags: Record<string, string>;
};

type DeployParams = {
  modelName: string;
  version: string;
  namespace?: string;
  image?: string;
  requestedBy?: string;
};

type DeployResult = {
  jobName: string;
  namespace: string;
  status: string;
  submittedAt: string;
};

const mlLogger = logger.child({ module: 'MlflowService' });

const DEFAULT_TRACKING_URI = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';
const DEFAULT_DEPLOY_IMAGE = process.env.ML_MODEL_DEPLOY_IMAGE || 'ghcr.io/mlflow/mlflow:latest';
const DEFAULT_NAMESPACE = process.env.ML_MODEL_DEPLOY_NAMESPACE || 'default';

async function callMlflow<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${DEFAULT_TRACKING_URI.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MLflow request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

function mapKeyValue<T>(items?: Array<{ key: string; value: T }>): Record<string, T> {
  const result: Record<string, T> = {};
  if (!items) return result;
  for (const item of items) {
    if (item.key && item.value !== undefined) {
      result[item.key] = item.value;
    }
  }
  return result;
}

function toIso(timestamp?: string | number): string | undefined {
  if (timestamp === undefined || timestamp === null) return undefined;
  const num = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  if (!Number.isFinite(num)) return undefined;
  return new Date(Number(num)).toISOString();
}

function buildJobSpec(params: DeployParams): V1Job {
  const namespace = params.namespace || DEFAULT_NAMESPACE;
  const safeName = params.modelName.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'model';
  const safeVersion = params.version.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'v';
  const suffix = Date.now().toString(36);
  const jobName = `deploy-${safeName}-${safeVersion}-${suffix}`.slice(0, 63);
  const env: V1EnvVar[] = [
    { name: 'MLFLOW_TRACKING_URI', value: DEFAULT_TRACKING_URI },
    { name: 'MODEL_NAME', value: params.modelName },
    { name: 'MODEL_VERSION', value: params.version },
  ];
  if (params.requestedBy) {
    env.push({ name: 'REQUESTED_BY', value: params.requestedBy });
  }

  const job: V1Job = {
    metadata: {
      name: jobName,
      namespace,
      labels: {
        app: 'model-deployer',
        'mlflow/model-name': params.modelName,
        'mlflow/model-version': params.version,
      },
    },
    spec: {
      backoffLimit: 0,
      template: {
        metadata: {
          labels: {
            app: 'model-deployer',
          },
        },
        spec: {
          restartPolicy: 'Never',
          containers: [
            {
              name: 'mlflow-model-deployer',
              image: params.image || DEFAULT_DEPLOY_IMAGE,
              imagePullPolicy: 'IfNotPresent',
              env,
              command: ['mlflow'],
              args: ['models', 'serve', '-m', `models:/${params.modelName}/${params.version}`, '--env-manager', 'local'],
            },
          ],
        },
      },
    },
  };

  return job;
}

class MlflowService {
  private batchApi?: BatchV1Api;

  private ensureBatchClient(): BatchV1Api {
    if (this.batchApi) {
      return this.batchApi;
    }
    const kc = new KubeConfig();
    if (process.env.KUBECONFIG) {
      kc.loadFromFile(process.env.KUBECONFIG);
    } else {
      try {
        kc.loadFromCluster();
      } catch {
        kc.loadFromDefault();
      }
    }
    this.batchApi = kc.makeApiClient(BatchV1Api);
    return this.batchApi;
  }

  private mapRunData(data?: MlflowRunData) {
    return {
      params: mapKeyValue(data?.params),
      metrics: mapKeyValue(data?.metrics),
      tags: mapKeyValue(data?.tags),
    };
  }

  async listModelVersions(modelName: string): Promise<ModelVersionSummary[]> {
    try {
      const versionsResponse = await callMlflow<{ model_versions: MlflowModelVersion[] }>(
        '/api/2.0/mlflow/model-versions/search',
        {
          method: 'POST',
          body: JSON.stringify({ filter: `name='${modelName}'`, max_results: 200 }),
        }
      );

      const versions = versionsResponse.model_versions || [];
      const summaries: ModelVersionSummary[] = [];
      for (const version of versions) {
        let runData: MlflowRunData | undefined;
        if (version.run_id) {
          try {
            const runResponse = await callMlflow<{ run: { data: MlflowRunData } }>(
              `/api/2.0/mlflow/runs/get?run_id=${encodeURIComponent(version.run_id)}`
            );
            runData = runResponse.run?.data;
          } catch (err) {
            mlLogger.warn('Failed to fetch MLflow run', { runId: version.run_id, err: String(err) });
          }
        }

        const mapped = this.mapRunData(runData);
        summaries.push({
          name: version.name,
          version: version.version,
          status: version.status,
          source: version.source,
          runId: version.run_id,
          description: version.description,
          createdAt: toIso(version.creation_timestamp),
          updatedAt: toIso(version.last_updated_timestamp),
          params: mapped.params,
          metrics: mapped.metrics,
          tags: mapped.tags,
        });
      }

      return summaries;
    } catch (error) {
      mlLogger.error('Failed to list MLflow model versions', { modelName, err: String(error) });
      throw error;
    }
  }

  async deployModelVersion(params: DeployParams): Promise<DeployResult> {
    const namespace = params.namespace || DEFAULT_NAMESPACE;
    const jobSpec = buildJobSpec(params);
    const batchApi = this.ensureBatchClient();
    const submittedAt = new Date().toISOString();

    try {
      await batchApi.createNamespacedJob(namespace, jobSpec);
      mlLogger.info('Submitted Kubernetes job for model deployment', {
        modelName: params.modelName,
        version: params.version,
        namespace,
        jobName: jobSpec.metadata?.name,
      });
      return {
        jobName: jobSpec.metadata?.name || 'unknown',
        namespace,
        status: 'QUEUED',
        submittedAt,
      };
    } catch (error) {
      mlLogger.error('Failed to submit deployment job', {
        modelName: params.modelName,
        version: params.version,
        namespace,
        err: String(error),
      });
      throw error;
    }
  }
}

export const mlflowService = new MlflowService();
