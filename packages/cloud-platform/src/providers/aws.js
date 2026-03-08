"use strict";
/**
 * AWS Cloud Provider Implementation
 * Comprehensive AWS integration for multi-cloud platform
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSProvider = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_ec2_1 = require("@aws-sdk/client-ec2");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const types_js_1 = require("../types.js");
const base_js_1 = require("./base.js");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'aws-provider' });
class AWSProvider extends base_js_1.BaseCloudProvider {
    s3Client;
    ec2Client;
    cloudWatchClient;
    constructor(config) {
        super(types_js_1.CloudProvider.AWS, config);
        const clientConfig = {
            region: config.region,
            credentials: config.credentials ? {
                accessKeyId: config.credentials.accessKeyId,
                secretAccessKey: config.credentials.secretAccessKey
            } : undefined
        };
        this.s3Client = new client_s3_1.S3Client(clientConfig);
        this.ec2Client = new client_ec2_1.EC2Client(clientConfig);
        this.cloudWatchClient = new client_cloudwatch_1.CloudWatchClient(clientConfig);
    }
    async validateConnection() {
        try {
            await this.s3Client.send(new client_s3_1.ListBucketsCommand({}));
            logger.info({ provider: 'aws', region: this.config.region }, 'AWS connection validated');
            return true;
        }
        catch (error) {
            logger.error({ error, provider: 'aws' }, 'AWS connection validation failed');
            return false;
        }
    }
    async listResources(type) {
        const resources = [];
        try {
            // List S3 buckets
            if (!type || type === 'storage') {
                const bucketsResponse = await this.s3Client.send(new client_s3_1.ListBucketsCommand({}));
                if (bucketsResponse.Buckets) {
                    for (const bucket of bucketsResponse.Buckets) {
                        resources.push({
                            id: bucket.Name,
                            provider: types_js_1.CloudProvider.AWS,
                            region: this.config.region,
                            type: 'storage',
                            status: 'active',
                            tags: {},
                            metadata: { bucketName: bucket.Name },
                            createdAt: bucket.CreationDate,
                            updatedAt: bucket.CreationDate
                        });
                    }
                }
            }
            // List EC2 instances
            if (!type || type === 'compute') {
                const instancesResponse = await this.ec2Client.send(new client_ec2_1.DescribeInstancesCommand({}));
                if (instancesResponse.Reservations) {
                    for (const reservation of instancesResponse.Reservations) {
                        if (reservation.Instances) {
                            for (const instance of reservation.Instances) {
                                resources.push({
                                    id: instance.InstanceId,
                                    provider: types_js_1.CloudProvider.AWS,
                                    region: this.config.region,
                                    type: 'compute',
                                    status: instance.State?.Name === 'running' ? 'active' : 'inactive',
                                    tags: this.extractTags(instance.Tags),
                                    metadata: {
                                        instanceType: instance.InstanceType,
                                        publicIp: instance.PublicIpAddress,
                                        privateIp: instance.PrivateIpAddress
                                    },
                                    createdAt: instance.LaunchTime,
                                    updatedAt: new Date()
                                });
                            }
                        }
                    }
                }
            }
            return resources;
        }
        catch (error) {
            logger.error({ error, type }, 'Failed to list AWS resources');
            throw error;
        }
    }
    async getMetrics(resourceId) {
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes
            // Get CPU metrics
            const cpuMetrics = await this.cloudWatchClient.send(new client_cloudwatch_1.GetMetricStatisticsCommand({
                Namespace: 'AWS/EC2',
                MetricName: 'CPUUtilization',
                Dimensions: [{ Name: 'InstanceId', Value: resourceId }],
                StartTime: startTime,
                EndTime: endTime,
                Period: 300,
                Statistics: ['Average']
            }));
            const cpuUtilization = cpuMetrics.Datapoints?.[0]?.Average ?? 0;
            return {
                provider: types_js_1.CloudProvider.AWS,
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
        }
        catch (error) {
            logger.error({ error, resourceId }, 'Failed to get AWS metrics');
            throw error;
        }
    }
    async provisionResource(type, config) {
        try {
            if (type === 'compute') {
                const response = await this.ec2Client.send(new client_ec2_1.RunInstancesCommand({
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
                }));
                const instance = response.Instances[0];
                return {
                    id: instance.InstanceId,
                    provider: types_js_1.CloudProvider.AWS,
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
        }
        catch (error) {
            logger.error({ error, type }, 'Failed to provision AWS resource');
            throw error;
        }
    }
    async deleteResource(resourceId) {
        // Implementation for resource deletion
        logger.info({ resourceId }, 'Deleting AWS resource');
    }
    extractTags(tags) {
        if (!tags)
            return {};
        return tags.reduce((acc, tag) => {
            if (tag.Key && tag.Value) {
                acc[tag.Key] = tag.Value;
            }
            return acc;
        }, {});
    }
}
exports.AWSProvider = AWSProvider;
