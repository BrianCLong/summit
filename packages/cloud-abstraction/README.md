# Cloud Abstraction Layer

A unified, cloud-agnostic interface for multi-cloud operations across AWS, Azure, and GCP.

## Features

- **Object Storage**: Unified interface for S3, Azure Blob Storage, and Google Cloud Storage
- **NoSQL Databases**: Abstract interface for DynamoDB, Cosmos DB, and Firestore
- **Message Queues**: Common API for SQS, Service Bus, and Pub/Sub
- **Secrets Management**: Unified secrets access across all cloud providers
- **Multi-Cloud Failover**: Automatic failover between cloud providers
- **Type-Safe**: Full TypeScript support with runtime validation

## Installation

```bash
npm install @summit/cloud-abstraction
```

## Usage

### Basic Storage Operations

```typescript
import { CloudFactory, CloudProvider } from '@summit/cloud-abstraction';

// Create storage provider
const storage = CloudFactory.createStorage({
  provider: CloudProvider.AWS,
  region: 'us-east-1'
});

// Upload object
await storage.upload('my-bucket', 'file.txt', Buffer.from('Hello World'), {
  contentType: 'text/plain',
  metadata: { author: 'summit' }
});

// Download object
const data = await storage.download('my-bucket', 'file.txt');

// List objects
const result = await storage.list('my-bucket', { prefix: 'documents/' });

// Delete object
await storage.delete('my-bucket', 'file.txt');

// Generate signed URL
const url = await storage.getSignedUrl('my-bucket', 'file.txt', 3600, 'get');
```

### Multi-Cloud with Automatic Failover

```typescript
import { CloudFactory, CloudProvider } from '@summit/cloud-abstraction';

// Create multi-cloud storage with failover
const storage = CloudFactory.createMultiCloudStorage([
  { provider: CloudProvider.AWS, region: 'us-east-1' },
  { provider: CloudProvider.AZURE, region: 'eastus' },
  { provider: CloudProvider.GCP, region: 'us-central1' }
]);

// Operations automatically failover to secondary providers on failure
await storage.upload('my-bucket', 'file.txt', data);
```

### Using Environment Variables

```typescript
// Set environment variables
// CLOUD_PROVIDER=aws
// CLOUD_REGION=us-east-1

const storage = CloudFactory.createStorageFromEnv();
await storage.upload('my-bucket', 'file.txt', data);
```

### Provider-Specific Implementations

```typescript
import { AWSStorageProvider, AzureStorageProvider, GCPStorageProvider } from '@summit/cloud-abstraction';

// AWS
const awsStorage = new AWSStorageProvider('us-east-1');

// Azure
const azureStorage = new AzureStorageProvider('myaccount', 'mykey');

// GCP
const gcpStorage = new GCPStorageProvider('my-project', '/path/to/key.json');
```

## API Reference

### Storage Interface

All storage providers implement the `IStorageProvider` interface:

- `upload(bucket, key, data, options)` - Upload an object
- `download(bucket, key, options)` - Download an object
- `delete(bucket, key)` - Delete an object
- `list(bucket, options)` - List objects
- `getMetadata(bucket, key)` - Get object metadata
- `exists(bucket, key)` - Check if object exists
- `copy(sourceBucket, sourceKey, destBucket, destKey)` - Copy object
- `getSignedUrl(bucket, key, expiresIn, operation)` - Generate signed URL

## Configuration

### AWS Configuration

```typescript
{
  provider: CloudProvider.AWS,
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY'
  }
}
```

### Azure Configuration

```typescript
{
  provider: CloudProvider.AZURE,
  region: 'eastus',
  credentials: {
    accountName: 'YOUR_ACCOUNT_NAME',
    accountKey: 'YOUR_ACCOUNT_KEY'
  }
}
```

### GCP Configuration

```typescript
{
  provider: CloudProvider.GCP,
  region: 'us-central1',
  credentials: {
    projectId: 'YOUR_PROJECT_ID',
    keyFilename: '/path/to/key.json'
  }
}
```

## Error Handling

All operations throw typed errors:

```typescript
import { StorageError, CloudProvider } from '@summit/cloud-abstraction';

try {
  await storage.upload('my-bucket', 'file.txt', data);
} catch (error) {
  if (error instanceof StorageError) {
    console.log(`Storage error for ${error.provider}:`, error.message);
    console.log('Original error:', error.originalError);
  }
}
```

## Testing

```bash
npm test
```

## License

Proprietary - Summit Project
