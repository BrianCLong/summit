/**
 * Cloud Abstraction Layer
 *
 * Provides unified interfaces for multi-cloud operations across:
 * - Object Storage (S3, Azure Blob, GCS)
 * - NoSQL Databases (DynamoDB, Cosmos DB, Firestore)
 * - Message Queues (SQS, Service Bus, Pub/Sub)
 * - Secrets Management (Secrets Manager, Key Vault, Secret Manager)
 */

export * from './storage';
export * from './database';
export * from './messaging';
export * from './secrets';
export * from './types';
export * from './factory';
