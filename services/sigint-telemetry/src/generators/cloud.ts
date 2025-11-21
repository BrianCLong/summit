/**
 * Cloud control plane event generators
 */

import type { IamEvent, ResourceEvent, ApiCallEvent, SecurityFinding } from '../schemas/cloud.js';
import {
  SeededRandom,
  syntheticId,
  syntheticTimestamp,
  syntheticIpv4,
  syntheticUsername,
} from './utils.js';

export interface CloudGeneratorConfig {
  rng?: SeededRandom;
  baseTime?: Date;
  tenantId?: string;
  accountId?: string;
}

const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
const services = ['ec2', 's3', 'iam', 'lambda', 'rds', 'dynamodb', 'sqs', 'sns'];

/** Generate synthetic IAM event */
export function generateIamEvent(config: CloudGeneratorConfig = {}): IamEvent {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();
  const accountId = config.accountId ?? `${rng.int(100000000000, 999999999999)}`;

  const isSuspicious = rng.bool(0.05);
  const actions = isSuspicious
    ? ['role_assumed', 'policy_attached', 'access_key_created', 'mfa_disabled']
    : ['user_modified', 'role_assumed', 'password_changed'];

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'cloud.iam',
    source: 'cloudtrail',
    tenantId: config.tenantId,
    classification: 'confidential',
    retentionPolicy: 'extended',
    isSynthetic: true,
    provider: 'aws',
    action: rng.pick(actions) as any,
    actorId: syntheticId(),
    actorType: rng.pick(['user', 'role']),
    actorName: syntheticUsername(rng),
    targetId: syntheticId(),
    targetType: 'user',
    targetName: syntheticUsername(rng),
    success: rng.bool(0.95),
    sourceIp: syntheticIpv4(rng),
    userAgent: 'aws-cli/2.0 Python/3.9',
    region: rng.pick(regions),
    accountId,
  };
}

/** Generate synthetic resource event */
export function generateResourceEvent(config: CloudGeneratorConfig = {}): ResourceEvent {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();
  const accountId = config.accountId ?? `${rng.int(100000000000, 999999999999)}`;

  const resourceTypes = ['ec2:instance', 's3:bucket', 'rds:instance', 'lambda:function'];
  const resourceType = rng.pick(resourceTypes);

  const isSuspicious = rng.bool(0.05);

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'cloud.resource',
    source: 'cloudtrail',
    tenantId: config.tenantId,
    classification: 'internal',
    retentionPolicy: 'standard',
    isSynthetic: true,
    provider: 'aws',
    action: rng.pick(['created', 'modified', 'deleted']),
    resourceType,
    resourceId: `i-${rng.int(10000000, 99999999)}`,
    resourceName: `synthetic-resource-${rng.int(100, 999)}`,
    region: rng.pick(regions),
    accountId,
    actorId: syntheticId(),
    actorName: syntheticUsername(rng),
    success: true,
    tags: { Environment: 'synthetic', Team: 'test' },
    isPublic: isSuspicious && resourceType === 's3:bucket',
    isEncrypted: !isSuspicious,
  };
}

/** Generate synthetic API call event */
export function generateApiCallEvent(config: CloudGeneratorConfig = {}): ApiCallEvent {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();
  const accountId = config.accountId ?? `${rng.int(100000000000, 999999999999)}`;

  const service = rng.pick(services);
  const readOnlyActions: Record<string, string[]> = {
    ec2: ['DescribeInstances', 'DescribeSecurityGroups'],
    s3: ['ListBuckets', 'GetObject'],
    iam: ['ListUsers', 'GetRole'],
  };
  const writeActions: Record<string, string[]> = {
    ec2: ['RunInstances', 'TerminateInstances'],
    s3: ['PutObject', 'DeleteObject'],
    iam: ['CreateUser', 'AttachRolePolicy'],
  };

  const isReadOnly = rng.bool(0.7);
  const actions = isReadOnly ? (readOnlyActions[service] ?? ['Get']) : (writeActions[service] ?? ['Create']);

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'cloud.api_call',
    source: 'cloudtrail',
    tenantId: config.tenantId,
    classification: 'internal',
    retentionPolicy: 'standard',
    isSynthetic: true,
    provider: 'aws',
    serviceName: service,
    apiAction: rng.pick(actions),
    actorId: syntheticId(),
    actorType: rng.pick(['user', 'role']),
    actorName: syntheticUsername(rng),
    sourceIp: syntheticIpv4(rng),
    userAgent: 'aws-sdk-js/3.0',
    region: rng.pick(regions),
    accountId,
    success: rng.bool(0.98),
    isReadOnly,
    resourcesAccessed: [`arn:aws:${service}:${rng.pick(regions)}:${accountId}:resource/${rng.int(100, 999)}`],
  };
}

/** Generate synthetic security finding */
export function generateSecurityFinding(config: CloudGeneratorConfig = {}): SecurityFinding {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();
  const accountId = config.accountId ?? `${rng.int(100000000000, 999999999999)}`;

  const findings = [
    {
      type: 's3-public-bucket',
      title: 'S3 Bucket Publicly Accessible',
      severity: 'high' as const,
      resourceType: 's3:bucket',
    },
    {
      type: 'iam-root-access',
      title: 'Root Account Used',
      severity: 'critical' as const,
      resourceType: 'iam:root',
    },
    {
      type: 'sg-open-ingress',
      title: 'Security Group Allows 0.0.0.0/0',
      severity: 'medium' as const,
      resourceType: 'ec2:security-group',
    },
    {
      type: 'unencrypted-volume',
      title: 'EBS Volume Not Encrypted',
      severity: 'medium' as const,
      resourceType: 'ec2:volume',
    },
  ];

  const finding = rng.pick(findings);
  const firstSeen = new Date(baseTime.getTime() - rng.int(86400000, 604800000));

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'cloud.security_finding',
    source: 'security-hub',
    tenantId: config.tenantId,
    classification: 'confidential',
    retentionPolicy: 'extended',
    isSynthetic: true,
    provider: 'aws',
    findingId: `finding-${rng.int(10000, 99999)}`,
    findingType: finding.type,
    title: finding.title,
    description: `Synthetic finding: ${finding.title}`,
    severity: finding.severity,
    resourceType: finding.resourceType,
    resourceId: `resource-${rng.int(1000, 9999)}`,
    region: rng.pick(regions),
    accountId,
    complianceFrameworks: ['CIS', 'SOC2'],
    remediation: 'Review and remediate the identified issue',
    status: rng.pick(['active', 'active', 'resolved']),
    firstSeen: firstSeen.toISOString(),
    lastSeen: syntheticTimestamp(baseTime),
  };
}

/** Generate batch of cloud events */
export function generateCloudBatch(
  count: number,
  config: CloudGeneratorConfig = {}
): Array<IamEvent | ResourceEvent | ApiCallEvent | SecurityFinding> {
  const rng = config.rng ?? new SeededRandom();
  const events: Array<IamEvent | ResourceEvent | ApiCallEvent | SecurityFinding> = [];

  for (let i = 0; i < count; i++) {
    const eventType = rng.pick(['iam', 'resource', 'api', 'api', 'api', 'finding']);
    const baseTime = new Date(Date.now() - rng.int(0, 3600000));

    switch (eventType) {
      case 'iam':
        events.push(generateIamEvent({ ...config, rng, baseTime }));
        break;
      case 'resource':
        events.push(generateResourceEvent({ ...config, rng, baseTime }));
        break;
      case 'api':
        events.push(generateApiCallEvent({ ...config, rng, baseTime }));
        break;
      case 'finding':
        events.push(generateSecurityFinding({ ...config, rng, baseTime }));
        break;
    }
  }

  return events;
}
