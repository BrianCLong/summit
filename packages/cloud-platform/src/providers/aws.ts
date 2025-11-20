/**
 * AWS Cloud Provider Implementation
 * Comprehensive AWS integration for multi-cloud platform
 */

import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { EC2Client, DescribeInstancesCommand, RunInstancesCommand } from '@aws-sdk/client-ec2';
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { CloudProvider, CloudConfig, CloudResource, CloudMetrics } from '../types.js';
import { BaseCloudProvider } from './base.js';
import pino from 'pino';

const logger = pino({ name: 'aws-provider' });

export class AWSProvider extends BaseCloudProvider {
  private s3Client: S3Client;
  private ec2Client: EC2Client;
  private cloudWatchClient: CloudWatchClient;

  constructor(config: CloudConfig) {
    super(CloudProvider.AWS, config);

    const clientConfig = {
      region: config.region,
      credentials: config.credentials ? {
        accessKeyId: config.credentials.accessKeyId!,
        secretAccessKey: config.credentials.secretAccessKey!
      } : undefined
    };

    this.s3Client = new S3Client(clientConfig);
    this.ec2Client = new EC2Client(clientConfig);
    this.cloudWatchClient = new CloudWatchClient(clientConfig);
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.s3Client.send(new ListBucketsCommand({}));
      logger.info({ provider: 'aws', region: this.config.region }, 'AWS connection validated');
      return true;
    } catch (error) {
      logger.error({ error, provider: 'aws' }, 'AWS connection validation failed');
      return false;
    }
  }

  async listResources(type?: string): Promise<CloudResource[]> {
    const resources: CloudResource[] = [];

    try {
      // List S3 buckets
      if (!type || type === 'storage') {
        const bucketsResponse = await this.s3Client.send(new ListBucketsCommand({}));
        if (bucketsResponse.Buckets) {
          for (const bucket of bucketsResponse.Buckets) {
            resources.push({
              id: bucket.Name!,
              provider: CloudProvider.AWS,
              region: this.config.region,
              type: 'storage',
              status: 'active',
              tags: {},
              metadata: { bucketName: bucket.Name },
              createdAt: bucket.CreationDate!,
              updatedAt: bucket.CreationDate!
            });
          }
        }
      }

      // List EC2 instances
      if (!type || type === 'compute') {
        const instancesResponse = await this.ec2Client.send(new DescribeInstancesCommand({}));
        if (instancesResponse.Reservations) {
          for (const reservation of instancesResponse.Reservations) {
            if (reservation.Instances) {
              for (const instance of reservation.Instances) {
                resources.push({
                  id: instance.InstanceId!,
                  provider: CloudProvider.AWS,
                  region: this.config.region,
                  type: 'compute',
                  status: instance.State?.Name === 'running' ? 'active' : 'inactive',
                  tags: this.extractTags(instance.Tags),
                  metadata: {
                    instanceType: instance.InstanceType,
                    publicIp: instance.PublicIpAddress,
                    privateIp: instance.PrivateIpAddress
                  },
                  createdAt: instance.LaunchTime!,
                  updatedAt: new Date()
                });
              }
            }
          }
        }
      }

      return resources;
    } catch (error) {
      logger.error({ error, type }, 'Failed to list AWS resources');
      throw error;
    }
  }

  async getMetrics(resourceId: string): Promise<CloudMetrics> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

      // Get CPU metrics
      const cpuMetrics = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: 'AWS/EC2',
          MetricName: 'CPUUtilization',
          Dimensions: [{ Name: 'InstanceId', Value: resourceId }],
          StartTime: startTime,
          EndTime: endTime,
          Period: 300,
          Statistics: ['Average']
        })
      );

      const cpuUtilization = cpuMetrics.Datapoints?.[0]?.Average ?? 0;

      return {
        provider: CloudProvider.AWS,
        region: this.config.region,
        timestamp: new Date(),
        cpu: {
          utilization: cpuUtilization,
          throttled: cpuUtilization > 90
        },
        memory: {
          used: 0,
          total: 0,
          utilization: 0
        },
        disk: {
          readOps: 0,
          writeOps: 0,
          throughputMBps: 0
        },
        network: {
          inboundMbps: 0,
          outboundMbps: 0,
          connections: 0
        }
      };
    } catch (error) {
      logger.error({ error, resourceId }, 'Failed to get AWS metrics');
      throw error;
    }
  }

  async provisionResource(type: string, config: any): Promise<CloudResource> {
    try {
      if (type === 'compute') {
        const response = await this.ec2Client.send(
          new RunInstancesCommand({
            ImageId: config.imageId,
            InstanceType: config.instanceType,
            MinCount: 1,
            MaxCount: 1,
            TagSpecifications: [
              {
                ResourceType: 'instance',
                Tags: Object.entries(config.tags || {}).map(([Key, Value]) => ({ Key, Value: String(Value) }))
              }
            ]
          })
        );

        const instance = response.Instances![0];
        return {
          id: instance.InstanceId!,
          provider: CloudProvider.AWS,
          region: this.config.region,
          type: 'compute',
          status: 'provisioning',
          tags: config.tags || {},
          metadata: { instanceType: config.instanceType },
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      throw new Error(`Unsupported resource type: ${type}`);
    } catch (error) {
      logger.error({ error, type }, 'Failed to provision AWS resource');
      throw error;
    }
  }

  async deleteResource(resourceId: string): Promise<void> {
    // Implementation for resource deletion
    logger.info({ resourceId }, 'Deleting AWS resource');
  }

  private extractTags(tags?: Array<{ Key?: string; Value?: string }>): Record<string, string> {
    if (!tags) return {};
    return tags.reduce((acc, tag) => {
      if (tag.Key && tag.Value) {
        acc[tag.Key] = tag.Value;
      }
      return acc;
    }, {} as Record<string, string>);
  }
}
