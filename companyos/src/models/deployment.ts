/**
 * Deployment Model
 * Represents deployment events tracked in CompanyOS
 */

export enum DeploymentEnvironment {
  DEV = 'dev',
  STAGING = 'staging',
  PREVIEW = 'preview',
  PRODUCTION = 'production',
  CANARY = 'canary',
}

export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled',
}

export enum DeploymentType {
  STANDARD = 'standard',
  CANARY = 'canary',
  BLUE_GREEN = 'blue_green',
  ROLLING = 'rolling',
  HOTFIX = 'hotfix',
}

export enum HealthCheckStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface Deployment {
  id: string;
  serviceName: string;
  version: string;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  deploymentType?: DeploymentType;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  deployedBy: string;
  commitSha?: string;
  githubRunId?: string;
  githubRunUrl?: string;
  githubReleaseUrl?: string;
  rollbackOfDeploymentId?: string;
  healthCheckStatus?: HealthCheckStatus;
  smokeTestStatus?: HealthCheckStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeploymentInput {
  serviceName: string;
  version: string;
  environment: DeploymentEnvironment;
  deploymentType?: DeploymentType;
  deployedBy: string;
  commitSha?: string;
  githubRunId?: string;
  githubRunUrl?: string;
  githubReleaseUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDeploymentInput {
  status?: DeploymentStatus;
  completedAt?: Date;
  durationSeconds?: number;
  healthCheckStatus?: HealthCheckStatus;
  smokeTestStatus?: HealthCheckStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface DeploymentFilter {
  serviceName?: string;
  environment?: DeploymentEnvironment;
  status?: DeploymentStatus;
  deployedBy?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface DeploymentStats {
  serviceName: string;
  environment: DeploymentEnvironment;
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  rolledBackDeployments: number;
  successRate: number;
  avgDurationSeconds?: number;
  lastDeploymentAt?: Date;
}
