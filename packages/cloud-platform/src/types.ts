/**
 * Cloud Data Platform - Core Types
 * Multi-cloud architecture types and interfaces
 */

import { z } from 'zod';

// Cloud Provider Types
export enum CloudProvider {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp',
  HYBRID = 'hybrid'
}

export enum CloudRegion {
  // AWS Regions
  AWS_US_EAST_1 = 'us-east-1',
  AWS_US_WEST_2 = 'us-west-2',
  AWS_EU_WEST_1 = 'eu-west-1',
  AWS_AP_SOUTHEAST_1 = 'ap-southeast-1',

  // Azure Regions
  AZURE_EAST_US = 'eastus',
  AZURE_WEST_US = 'westus',
  AZURE_WEST_EUROPE = 'westeurope',
  AZURE_SOUTHEAST_ASIA = 'southeastasia',

  // GCP Regions
  GCP_US_CENTRAL1 = 'us-central1',
  GCP_US_WEST1 = 'us-west1',
  GCP_EUROPE_WEST1 = 'europe-west1',
  GCP_ASIA_SOUTHEAST1 = 'asia-southeast1'
}

// Configuration Schemas
export const CloudConfigSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  region: z.string(),
  credentials: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    tenantId: z.string().optional(),
    projectId: z.string().optional(),
    privateKey: z.string().optional()
  }).optional(),
  endpoint: z.string().optional(),
  timeout: z.number().default(30000),
  retries: z.number().default(3)
});

export type CloudConfig = z.infer<typeof CloudConfigSchema>;

// Multi-Cloud Deployment Config
export const MultiCloudDeploymentSchema = z.object({
  primary: CloudConfigSchema,
  secondary: z.array(CloudConfigSchema).optional(),
  replicationStrategy: z.enum(['sync', 'async', 'geo-replicated']).default('async'),
  failoverEnabled: z.boolean().default(true),
  crossCloudNetworking: z.boolean().default(false)
});

export type MultiCloudDeployment = z.infer<typeof MultiCloudDeploymentSchema>;

// Cloud Resource Types
export interface CloudResource {
  id: string;
  provider: CloudProvider;
  region: string;
  type: string;
  status: 'active' | 'inactive' | 'provisioning' | 'error';
  tags: Record<string, string>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CloudInstance extends CloudResource {
  type: 'compute';
  instanceType: string;
  cpuCores: number;
  memoryGB: number;
  diskGB: number;
  publicIP?: string;
  privateIP?: string;
}

export interface CloudStorage extends CloudResource {
  type: 'storage';
  storageClass: 'hot' | 'cool' | 'cold' | 'archive';
  capacityGB: number;
  usedGB: number;
  bucketName: string;
}

// Cost Management Types
export interface CloudCostMetrics {
  provider: CloudProvider;
  region: string;
  resourceType: string;
  costUSD: number;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    other: number;
  };
  forecast?: {
    nextMonth: number;
    nextQuarter: number;
  };
}

// Monitoring and Operations
export interface CloudMetrics {
  provider: CloudProvider;
  region: string;
  timestamp: Date;
  cpu: {
    utilization: number;
    throttled: boolean;
  };
  memory: {
    used: number;
    total: number;
    utilization: number;
  };
  disk: {
    readOps: number;
    writeOps: number;
    throughputMBps: number;
  };
  network: {
    inboundMbps: number;
    outboundMbps: number;
    connections: number;
  };
}

// Disaster Recovery Types
export interface DisasterRecoveryConfig {
  enabled: boolean;
  rto: number; // Recovery Time Objective (minutes)
  rpo: number; // Recovery Point Objective (minutes)
  backupRegions: string[];
  failoverPriority: CloudProvider[];
  automatedFailover: boolean;
}

// Network Configuration
export interface CloudNetworkConfig {
  vpcId?: string;
  subnetId?: string;
  securityGroups?: string[];
  loadBalancerArn?: string;
  privateEndpoints: boolean;
  vpnEnabled: boolean;
}

// Optimization Recommendations
export interface OptimizationRecommendation {
  id: string;
  provider: CloudProvider;
  category: 'cost' | 'performance' | 'security' | 'reliability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  potentialSavings?: number;
  estimatedImpact: string;
  implementation: {
    effort: 'low' | 'medium' | 'high';
    steps: string[];
  };
}
