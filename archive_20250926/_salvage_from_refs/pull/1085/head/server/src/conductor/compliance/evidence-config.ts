// server/src/conductor/compliance/evidence-config.ts

import { EvidenceStorageConfig } from './evidence-store.js';

/**
 * Evidence Store Configuration for Different Environments
 */
export const getEvidenceStoreConfig = (): EvidenceStorageConfig => {
  const environment = process.env.NODE_ENV || 'development';
  
  const baseConfig: EvidenceStorageConfig = {
    bucketName: process.env.EVIDENCE_STORE_BUCKET || 'conductor-evidence-dev',
    region: process.env.EVIDENCE_STORE_REGION || 'us-east-1',
    kmsKeyId: process.env.EVIDENCE_STORE_KMS_KEY_ID, // Optional customer-managed key
    retentionPolicies: {
      hot: 90,      // 90 days in hot storage
      warm: 365,    // 1 year in warm storage (IA)
      cold: 2555,   // 7 years in cold storage (Glacier)
      legal_hold: 3650 // 10 years for legal hold (Deep Archive)
    },
    compressionThreshold: 1024 * 1024 // 1MB threshold for compression
  };

  // Environment-specific overrides
  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        bucketName: process.env.EVIDENCE_STORE_BUCKET || 'conductor-evidence-prod',
        kmsKeyId: process.env.EVIDENCE_STORE_KMS_KEY_ID, // Required in production
        retentionPolicies: {
          ...baseConfig.retentionPolicies,
          // Production may have longer retention requirements
          cold: 2555, // 7 years as per SOC2 requirements
          legal_hold: 3650 // 10 years for legal compliance
        }
      };
      
    case 'staging':
      return {
        ...baseConfig,
        bucketName: process.env.EVIDENCE_STORE_BUCKET || 'conductor-evidence-staging',
        retentionPolicies: {
          hot: 30,      // Shorter retention in staging
          warm: 90,
          cold: 365,
          legal_hold: 365
        }
      };
      
    default: // development and test
      return {
        ...baseConfig,
        retentionPolicies: {
          hot: 7,       // Very short retention in dev
          warm: 30,
          cold: 90,
          legal_hold: 90
        },
        compressionThreshold: 10 * 1024 // 10KB threshold for testing
      };
  }
};

/**
 * S3 Lifecycle Policy Configuration for Evidence Store
 * Apply this policy to the evidence store bucket
 */
export const getS3LifecyclePolicy = () => ({
  Rules: [
    {
      ID: 'ConductorEvidenceLifecycle',
      Status: 'Enabled',
      Filter: {
        Prefix: 'evidence/'
      },
      Transitions: [
        {
          Days: 90,
          StorageClass: 'STANDARD_IA' // Move to Infrequent Access after 90 days
        },
        {
          Days: 365,
          StorageClass: 'GLACIER_IR' // Move to Glacier Instant Retrieval after 1 year
        },
        {
          Days: 1095, // 3 years
          StorageClass: 'GLACIER' // Move to Glacier Flexible Retrieval
        },
        {
          Days: 2555, // 7 years
          StorageClass: 'DEEP_ARCHIVE' // Move to Deep Archive for long-term retention
        }
      ]
    },
    {
      ID: 'ConductorLegalHoldProtection',
      Status: 'Enabled',
      Filter: {
        Tag: {
          Key: 'legal_hold',
          Value: 'true'
        }
      },
      // Legal hold items are exempt from expiration
      Status: 'Enabled'
    },
    {
      ID: 'ConductorNonCriticalCleanup',
      Status: 'Enabled',
      Filter: {
        Tag: {
          Key: 'retention_class',
          Value: 'short_term'
        }
      },
      Expiration: {
        Days: 30 // Delete non-critical evidence after 30 days
      }
    }
  ]
});

/**
 * Bucket Policy for Evidence Store
 * Enforces encryption and access controls
 */
export const getS3BucketPolicy = (bucketName: string, kmsKeyArn?: string) => ({
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'DenyUnencryptedObjectUploads',
      Effect: 'Deny',
      Principal: '*',
      Action: 's3:PutObject',
      Resource: `arn:aws:s3:::${bucketName}/*`,
      Condition: {
        StringNotEquals: {
          's3:x-amz-server-side-encryption': kmsKeyArn ? 'aws:kms' : 'AES256'
        }
      }
    },
    {
      Sid: 'DenyInsecureConnections',
      Effect: 'Deny',
      Principal: '*',
      Action: 's3:*',
      Resource: [
        `arn:aws:s3:::${bucketName}/*`,
        `arn:aws:s3:::${bucketName}`
      ],
      Condition: {
        Bool: {
          'aws:SecureTransport': 'false'
        }
      }
    },
    ...(kmsKeyArn ? [{
      Sid: 'RequireKMSEncryption',
      Effect: 'Deny',
      Principal: '*',
      Action: 's3:PutObject',
      Resource: `arn:aws:s3:::${bucketName}/*`,
      Condition: {
        StringNotEquals: {
          's3:x-amz-server-side-encryption-aws-kms-key-id': kmsKeyArn
        }
      }
    }] : [])
  ]
});

/**
 * CloudTrail Configuration for Evidence Store Audit Logging
 */
export const getCloudTrailConfig = (bucketName: string) => ({
  TrailName: `conductor-evidence-audit-${process.env.NODE_ENV}`,
  S3BucketName: `${bucketName}-audit-logs`,
  IncludeGlobalServiceEvents: true,
  IsMultiRegionTrail: true,
  EnableLogFileValidation: true,
  EventSelectors: [
    {
      ReadWriteType: 'All',
      IncludeManagementEvents: true,
      DataResources: [
        {
          Type: 'AWS::S3::Object',
          Values: [`arn:aws:s3:::${bucketName}/evidence/*`]
        }
      ]
    }
  ]
});

/**
 * IAM Policy for Conductor Evidence Store Access
 */
export const getEvidenceStoreIAMPolicy = (bucketName: string, kmsKeyArn?: string) => ({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket'
      ],
      Resource: [
        `arn:aws:s3:::${bucketName}`,
        `arn:aws:s3:::${bucketName}/*`
      ]
    },
    {
      Effect: 'Allow',
      Action: [
        's3:GetObjectTagging',
        's3:PutObjectTagging',
        's3:GetObjectRetention',
        's3:PutObjectRetention'
      ],
      Resource: `arn:aws:s3:::${bucketName}/*`
    },
    ...(kmsKeyArn ? [{
      Effect: 'Allow',
      Action: [
        'kms:Decrypt',
        'kms:Encrypt',
        'kms:GenerateDataKey',
        'kms:DescribeKey'
      ],
      Resource: kmsKeyArn
    }] : [])
  ]
});

/**
 * Evidence Store Monitoring Configuration
 */
export const getEvidenceStoreMonitoring = () => ({
  cloudWatchMetrics: {
    namespace: 'Conductor/EvidenceStore',
    metrics: [
      {
        name: 'EvidenceUploaded',
        unit: 'Count',
        dimensions: ['TenantId', 'Framework', 'EvidenceType']
      },
      {
        name: 'EvidenceRetrieved',
        unit: 'Count', 
        dimensions: ['TenantId', 'Framework']
      },
      {
        name: 'StorageSize',
        unit: 'Bytes',
        dimensions: ['TenantId', 'StorageClass']
      },
      {
        name: 'ComplianceReportGenerated',
        unit: 'Count',
        dimensions: ['TenantId', 'Framework']
      }
    ]
  },
  alarms: [
    {
      name: 'EvidenceUploadFailures',
      metric: 'EvidenceUploadErrors',
      threshold: 10,
      period: 300, // 5 minutes
      evaluationPeriods: 2,
      comparisonOperator: 'GreaterThanThreshold'
    },
    {
      name: 'StorageQuotaExceeded',
      metric: 'StorageSize',
      threshold: 1000 * 1000 * 1000 * 100, // 100GB
      period: 3600, // 1 hour
      evaluationPeriods: 1,
      comparisonOperator: 'GreaterThanThreshold'
    },
    {
      name: 'UnauthorizedAccess',
      metric: 'UnauthorizedAPICallsSum',
      threshold: 5,
      period: 300,
      evaluationPeriods: 1,
      comparisonOperator: 'GreaterThanThreshold'
    }
  ]
});