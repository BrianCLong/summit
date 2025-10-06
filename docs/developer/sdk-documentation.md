# IntelGraph SDK Documentation

## Overview

The IntelGraph SDK provides programmatic access to both IntelGraph Core and Maestro autonomous orchestration systems through TypeScript and Python client libraries. This documentation covers installation, configuration, and usage examples for both SDKs.

## TypeScript SDK

### Installation

```bash
npm install @intelgraph/sdk
# or
yarn add @intelgraph/sdk
# or
pnpm add @intelgraph/sdk
```

### Configuration

```typescript
import { IntelGraphClient, MaestroClient } from '@intelgraph/sdk';

// IntelGraph Core client
const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  apiKey: process.env.INTELGRAPH_API_KEY,
  // Optional configuration
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
});

// Maestro orchestration client  
const maestro = new MaestroClient({
  apiUrl: 'https://maestro.intelgraph.ai/v1',
  apiKey: process.env.INTELGRAPH_API_KEY,
  // Optional configuration
  timeout: 60000, // Longer timeout for orchestration
  maxConcurrentRequests: 5,
});
```

### Authentication

```typescript
// Using API key (recommended for server-side)
const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  apiKey: 'your-api-key-here'
});

// Using JWT token (for user-based authentication)
const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  token: 'your-jwt-token-here'
});

// Refreshing tokens automatically
client.onTokenRefresh(async (client) => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.getRefreshToken()}`
    }
  });
  
  const { token, refreshToken } = await response.json();
  client.setToken(token, refreshToken);
});
```

### Core Operations

#### Graph Management

```typescript
import { CreateGraphInput, UpdateGraphInput } from '@intelgraph/sdk';

// Create a new graph
const graph = await client.graphs.create({
  name: 'Threat Analysis Q4 2024',
  description: 'Comprehensive threat landscape analysis',
  tags: ['threat-intel', 'q4-2024'],
  configuration: {
    layout: 'force-directed',
    theme: 'dark',
    autoSave: true
  }
});

console.log(`Created graph: ${graph.id}`);

// List graphs with filtering
const graphs = await client.graphs.list({
  search: 'threat',
  tags: ['q4-2024'],
  page: 1,
  limit: 20
});

// Get specific graph
const graphDetails = await client.graphs.get(graph.id);

// Update graph
const updatedGraph = await client.graphs.update(graph.id, {
  name: 'Updated Threat Analysis',
  tags: [...graphDetails.tags, 'updated']
});

// Delete graph
await client.graphs.delete(graph.id);
```

#### Entity Management

```typescript
// Create entity
const entity = await client.entities.create(graph.id, {
  type: 'Person',
  properties: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    department: 'Engineering'
  },
  metadata: {
    source: 'OSINT',
    confidence: 0.85,
    lastVerified: new Date()
  }
});

// List entities with filtering
const entities = await client.entities.list(graph.id, {
  type: 'Person',
  search: 'john',
  page: 1,
  limit: 50
});

// Update entity
const updatedEntity = await client.entities.update(entity.id, {
  properties: {
    ...entity.properties,
    title: 'Senior Engineer'
  }
});

// Delete entity
await client.entities.delete(entity.id);
```

#### Relationship Management

```typescript
// Create relationship
const relationship = await client.relationships.create({
  type: 'WORKS_WITH',
  sourceId: entity1.id,
  targetId: entity2.id,
  properties: {
    relationship_type: 'colleague',
    since: '2020-01-15',
    projects: ['project-alpha', 'project-beta']
  },
  metadata: {
    source: 'HR_SYSTEM',
    confidence: 0.95
  }
});

// List relationships
const relationships = await client.relationships.list(graph.id, {
  type: 'WORKS_WITH',
  sourceId: entity1.id
});

// Update relationship
await client.relationships.update(relationship.id, {
  properties: {
    ...relationship.properties,
    projects: [...relationship.properties.projects, 'project-gamma']
  }
});
```

#### Graph Querying

```typescript
// Execute Cypher query
const queryResult = await client.graphs.query(graph.id, {
  query: `
    MATCH (p:Person)-[r:WORKS_WITH]->(other:Person)
    WHERE p.department = $department
    RETURN p, r, other
    LIMIT $limit
  `,
  parameters: {
    department: 'Engineering',
    limit: 10
  },
  includeMetrics: true
});

console.log('Query results:', queryResult.data);
console.log('Execution time:', queryResult.stats?.executionTime, 'ms');

// Complex graph analysis query
const analysisResult = await client.graphs.query(graph.id, {
  query: `
    CALL gds.pageRank.stream('graph-projection')
    YIELD nodeId, score
    RETURN gds.util.asNode(nodeId).name as name, score
    ORDER BY score DESC
    LIMIT 20
  `
});
```

#### AI-Powered Analysis

```typescript
// Trigger AI analysis
const analysisJob = await client.ai.analyze({
  graphId: graph.id,
  analysisType: 'community_detection',
  parameters: {
    algorithm: 'louvain',
    resolution: 1.0,
    includeMetrics: true
  }
});

// Check analysis status
const status = await client.ai.getJobStatus(analysisJob.jobId);

if (status.status === 'completed') {
  console.log('Analysis insights:', status.results?.insights);
} else if (status.status === 'failed') {
  console.error('Analysis failed:', status.error);
}

// Wait for analysis completion
const finalResult = await client.ai.waitForCompletion(analysisJob.jobId, {
  maxWaitTime: 300000, // 5 minutes
  pollInterval: 5000   // Check every 5 seconds
});

// Entity enhancement
const enhancedEntity = await client.ai.enhanceEntity(entity.id, {
  provider: 'openai',
  includeRelatedEntities: true,
  confidenceThreshold: 0.8
});
```

### Maestro Orchestration

#### Basic Orchestration

```typescript
// Execute orchestration request
const orchestration = await maestro.orchestrate({
  query: 'Analyze the threat landscape for financial services sector in Q4 2024',
  context: {
    userId: 'user-123',
    tenantId: 'tenant-456',
    purpose: 'intelligence_analysis',
    urgency: 'high',
    budgetLimit: 50.0,
    qualityThreshold: 0.85,
    expectedOutputLength: 2000,
    requiredSources: 15,
    synthesisStrategy: 'comprehensive'
  },
  constraints: {
    maxLatency: 45000,
    maxCost: 45.0,
    requireCitations: true,
    confidenceThreshold: 0.7,
    allowedDomains: ['reuters.com', 'bloomberg.com', 'ft.com'],
    blockedDomains: ['unreliable-news.com']
  }
});

// Check if orchestration is complete
if ('answer' in orchestration) {
  // Synchronous response
  console.log('Answer:', orchestration.answer);
  console.log('Confidence:', orchestration.confidence);
  console.log('Sources used:', orchestration.metadata.sourcesUsed);
  console.log('Total cost:', orchestration.metadata.totalCost);
} else {
  // Asynchronous response - poll for status
  const result = await maestro.waitForOrchestration(orchestration.orchestrationId);
  console.log('Final result:', result);
}
```

#### Workflow Management

```typescript
// List available workflows
const workflows = await maestro.workflows.list({
  category: 'data-ingestion'
});

// Get workflow details
const workflow = await maestro.workflows.get(workflows[0].id);

// Execute workflow
const execution = await maestro.workflows.execute(workflow.id, {
  parameters: {
    source_bucket: 'intel-data-staging',
    caseId: 'CASE-2024-001',
    outputFormat: 'json'
  },
  dryRun: false
});

// Monitor execution
const executionStatus = await maestro.workflows.getExecutionStatus(execution.executionId);

// Cancel execution if needed
if (executionStatus.status === 'running') {
  await maestro.workflows.cancelExecution(execution.executionId);
}
```

#### Runbook Management

```typescript
// List runbooks
const runbooks = await maestro.runbooks.list({
  owner: 'sre@summit',
  approved: true
});

// Execute runbook (requires approval for some runbooks)
try {
  const execution = await maestro.runbooks.execute('backfill-entity-resolver', {
    inputs: {
      since: '2024-01-01T00:00:00Z',
      until: '2024-01-31T23:59:59Z',
      batchSize: 1000
    },
    approvalToken: 'approval-token-from-approver' // If required
  });
  
  console.log('Runbook execution started:', execution.executionId);
} catch (error) {
  if (error.code === 'APPROVAL_REQUIRED') {
    console.log('Approval required for this runbook');
    // Handle approval workflow
  }
}
```

#### Premium Model Router

```typescript
// Get available models
const models = await maestro.router.getModels();
console.log('Available models:', models.map(m => `${m.name} (${m.provider})`));

// Get optimal model recommendation
const recommendation = await maestro.router.optimize({
  taskType: 'synthesis_enhancement',
  context: {
    complexity: 0.8,
    budget: 10.0,
    urgency: 'high',
    qualityRequirement: 0.9,
    expectedOutputLength: 1500
  },
  constraints: {
    maxCost: 8.0,
    maxLatency: 15000,
    requiredCapabilities: ['reasoning', 'analysis']
  }
});

console.log('Recommended model:', recommendation.selectedModel.name);
console.log('Estimated cost:', recommendation.estimatedCost);
console.log('Reasoning:', recommendation.reasoning);
```

### Real-time Features

#### WebSocket Connection

```typescript
// Connect to real-time updates
const ws = client.realtime.connect();

// Listen for graph updates
ws.subscribe(`graph.${graph.id}`, (event) => {
  switch (event.type) {
    case 'ENTITY_ADDED':
      console.log('New entity added:', event.entity);
      break;
    case 'ENTITY_UPDATED':
      console.log('Entity updated:', event.entity);
      break;
    case 'RELATIONSHIP_ADDED':
      console.log('New relationship added:', event.relationship);
      break;
  }
});

// Listen for analysis progress
ws.subscribe(`analysis.${analysisJob.jobId}`, (progress) => {
  console.log(`Analysis progress: ${progress.percentage}%`);
  console.log(`Current stage: ${progress.currentStage}`);
});

// Cleanup
ws.unsubscribe(`graph.${graph.id}`);
ws.disconnect();
```

### Error Handling

```typescript
import { IntelGraphError, ValidationError, AuthenticationError } from '@intelgraph/sdk';

try {
  const graph = await client.graphs.create(invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.validationErrors);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed, refreshing token...');
    await client.refreshToken();
    // Retry operation
  } else if (error instanceof IntelGraphError) {
    console.log('API Error:', error.message);
    console.log('Error code:', error.code);
    console.log('Status:', error.status);
  } else {
    console.error('Unexpected error:', error);
  }
}

// Global error handling
client.onError((error) => {
  console.error('IntelGraph SDK Error:', error);
  // Send to error reporting service
});
```

### Advanced Configuration

```typescript
// Custom HTTP client configuration
const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  apiKey: process.env.INTELGRAPH_API_KEY,
  
  // HTTP configuration
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => error.response?.status >= 500,
  
  // Request/response interceptors
  requestInterceptors: [
    (config) => {
      config.headers['X-Request-ID'] = generateRequestId();
      return config;
    }
  ],
  
  responseInterceptors: [
    (response) => {
      console.log(`Request ${response.config.headers['X-Request-ID']} completed`);
      return response;
    }
  ],
  
  // Rate limiting
  rateLimitHeaders: {
    limit: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset'
  },
  
  // Caching
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    exclude: ['/graphs/*/query'] // Don't cache query results
  }
});
```

## Python SDK

### Installation

```bash
pip install intelgraph-sdk
```

### Configuration

```python
from intelgraph import IntelGraphClient, MaestroClient
import os

# IntelGraph Core client
client = IntelGraphClient(
    api_url='https://api.intelgraph.ai/v2',
    api_key=os.environ['INTELGRAPH_API_KEY'],
    timeout=30,
    max_retries=3
)

# Maestro orchestration client
maestro = MaestroClient(
    api_url='https://maestro.intelgraph.ai/v1',
    api_key=os.environ['INTELGRAPH_API_KEY'],
    timeout=60
)
```

### Basic Usage

```python
import asyncio
from datetime import datetime
from intelgraph import IntelGraphClient, CreateGraphInput, CreateEntityInput

async def main():
    client = IntelGraphClient(
        api_url='https://api.intelgraph.ai/v2',
        api_key=os.environ['INTELGRAPH_API_KEY']
    )
    
    # Create a graph
    graph = await client.graphs.create(CreateGraphInput(
        name='Python SDK Test Graph',
        description='Testing the Python SDK',
        tags=['sdk', 'test', 'python']
    ))
    
    print(f"Created graph: {graph.id}")
    
    # Add entities
    person1 = await client.entities.create(graph.id, CreateEntityInput(
        type='Person',
        properties={
            'name': 'Alice Johnson',
            'email': 'alice@example.com',
            'department': 'Engineering'
        },
        metadata={
            'source': 'HR_SYSTEM',
            'confidence': 0.95,
            'last_verified': datetime.now()
        }
    ))
    
    person2 = await client.entities.create(graph.id, CreateEntityInput(
        type='Person',
        properties={
            'name': 'Bob Smith',
            'email': 'bob@example.com', 
            'department': 'Engineering'
        }
    ))
    
    # Create relationship
    relationship = await client.relationships.create(CreateRelationshipInput(
        type='WORKS_WITH',
        source_id=person1.id,
        target_id=person2.id,
        properties={
            'relationship_type': 'colleague',
            'since': '2022-01-15'
        }
    ))
    
    print(f"Created relationship: {relationship.id}")
    
    # Query the graph
    result = await client.graphs.query(graph.id, {
        'query': '''
            MATCH (p1:Person)-[r:WORKS_WITH]->(p2:Person)
            RETURN p1.name, r.relationship_type, p2.name
        ''',
        'parameters': {}
    })
    
    print("Query results:")
    for record in result.data:
        print(f"  {record}")

if __name__ == '__main__':
    asyncio.run(main())
```

### AI Analysis

```python
from intelgraph.ai import AnalysisType
import asyncio

async def run_analysis():
    client = IntelGraphClient(api_key=os.environ['INTELGRAPH_API_KEY'])
    
    # Start analysis
    job = await client.ai.analyze(
        graph_id='graph-id',
        analysis_type=AnalysisType.COMMUNITY_DETECTION,
        parameters={
            'algorithm': 'louvain',
            'resolution': 1.2,
            'min_community_size': 5
        }
    )
    
    print(f"Analysis started: {job.job_id}")
    
    # Wait for completion
    result = await client.ai.wait_for_completion(
        job.job_id,
        max_wait_time=300,  # 5 minutes
        poll_interval=5     # Check every 5 seconds
    )
    
    if result.status == 'completed':
        print(f"Found {len(result.results['communities'])} communities")
        for insight in result.insights:
            print(f"Insight: {insight['description']} (confidence: {insight['confidence']})")
    else:
        print(f"Analysis failed: {result.error}")

asyncio.run(run_analysis())
```

### Maestro Orchestration

```python
from intelgraph.maestro import OrchestrationRequest, OrchestrationContext

async def orchestrate_intelligence():
    maestro = MaestroClient(api_key=os.environ['INTELGRAPH_API_KEY'])
    
    request = OrchestrationRequest(
        query='What are the latest cybersecurity threats targeting healthcare organizations?',
        context=OrchestrationContext(
            user_id='user-123',
            tenant_id='tenant-456',
            purpose='intelligence_analysis',
            urgency='high',
            budget_limit=25.0,
            quality_threshold=0.8
        ),
        constraints={
            'max_latency': 30000,
            'require_citations': True,
            'confidence_threshold': 0.75
        }
    )
    
    # Execute orchestration
    result = await maestro.orchestrate(request)
    
    if hasattr(result, 'answer'):
        # Synchronous result
        print(f"Answer: {result.answer}")
        print(f"Confidence: {result.confidence}")
        print(f"Sources: {result.metadata.sources_used}")
        print(f"Cost: ${result.metadata.total_cost}")
        
        for citation in result.citations:
            print(f"Source: {citation.title} ({citation.url})")
    else:
        # Asynchronous result
        final_result = await maestro.wait_for_orchestration(result.orchestration_id)
        print(f"Final result: {final_result.answer}")

asyncio.run(orchestrate_intelligence())
```

### Data Processing Pipeline

```python
import pandas as pd
from intelgraph.connectors import CSVConnector, STIXConnector
from intelgraph.processors import EntityResolver, GraphBuilder

async def process_intelligence_data():
    client = IntelGraphClient(api_key=os.environ['INTELGRAPH_API_KEY'])
    
    # Create graph for processed data
    graph = await client.graphs.create({
        'name': 'Intelligence Data Pipeline',
        'description': 'Processed intelligence from multiple sources'
    })
    
    # Load data from CSV
    csv_connector = CSVConnector()
    csv_data = csv_connector.load('threat_indicators.csv')
    
    # Load STIX data
    stix_connector = STIXConnector()
    stix_data = stix_connector.load('threat_feed.json')
    
    # Process and resolve entities
    entity_resolver = EntityResolver(confidence_threshold=0.8)
    resolved_entities = entity_resolver.resolve([csv_data, stix_data])
    
    # Build graph structure
    graph_builder = GraphBuilder(client)
    await graph_builder.build_from_data(graph.id, resolved_entities)
    
    print(f"Processed {len(resolved_entities)} entities into graph {graph.id}")
    
    # Run analysis
    analysis = await client.ai.analyze(
        graph.id,
        'threat_assessment',
        parameters={'include_predictions': True}
    )
    
    return analysis

# Run pipeline
result = asyncio.run(process_intelligence_data())
```

### Integration with ML/AI Frameworks

```python
import torch
import networkx as nx
from intelgraph.ml import GraphNeuralNetwork, EmbeddingGenerator

async def advanced_ml_analysis():
    client = IntelGraphClient(api_key=os.environ['INTELGRAPH_API_KEY'])
    
    # Fetch graph data
    graph = await client.graphs.get_with_data('graph-id')
    
    # Convert to NetworkX for analysis
    nx_graph = nx.Graph()
    for entity in graph.entities:
        nx_graph.add_node(entity.id, **entity.properties)
    
    for rel in graph.relationships:
        nx_graph.add_edge(rel.source_id, rel.target_id, **rel.properties)
    
    # Generate embeddings
    embedding_gen = EmbeddingGenerator(
        model='node2vec',
        dimensions=128,
        walk_length=80,
        num_walks=10
    )
    
    embeddings = embedding_gen.fit_transform(nx_graph)
    
    # Train GNN model
    gnn = GraphNeuralNetwork(
        input_dim=128,
        hidden_dim=64,
        output_dim=32,
        num_layers=3
    )
    
    # Convert to PyTorch tensors
    node_features = torch.tensor(embeddings, dtype=torch.float32)
    edge_index = torch.tensor([
        [rel.source_id, rel.target_id] for rel in graph.relationships
    ]).t().contiguous()
    
    # Forward pass
    with torch.no_grad():
        node_representations = gnn(node_features, edge_index)
    
    # Update entities with learned representations
    for i, entity in enumerate(graph.entities):
        await client.entities.update(entity.id, {
            'properties': {
                **entity.properties,
                'ml_embedding': node_representations[i].tolist()
            }
        })
    
    print(f"Updated {len(graph.entities)} entities with ML embeddings")

asyncio.run(advanced_ml_analysis())
```

### Error Handling and Logging

```python
import logging
from intelgraph.exceptions import (
    IntelGraphError, 
    ValidationError,
    AuthenticationError,
    RateLimitError
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def robust_graph_operation():
    client = IntelGraphClient(api_key=os.environ['INTELGRAPH_API_KEY'])
    
    try:
        # Attempt operation
        graph = await client.graphs.create({
            'name': 'Test Graph',
            'invalid_field': 'this will cause validation error'
        })
        
    except ValidationError as e:
        logger.error(f"Validation error: {e.validation_errors}")
        # Handle validation errors
        
    except AuthenticationError as e:
        logger.error(f"Authentication failed: {e}")
        # Refresh token or re-authenticate
        
    except RateLimitError as e:
        logger.warning(f"Rate limited. Retry after: {e.retry_after} seconds")
        await asyncio.sleep(e.retry_after)
        # Retry operation
        
    except IntelGraphError as e:
        logger.error(f"API error: {e.message} (code: {e.code}, status: {e.status})")
        # Handle API errors
        
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        # Handle unexpected errors
```

## SDK Utilities and Helpers

### Batch Operations

```typescript
// TypeScript batch operations
import { BatchProcessor } from '@intelgraph/sdk/utils';

const batchProcessor = new BatchProcessor(client, {
  batchSize: 100,
  maxConcurrency: 5,
  retryFailedBatches: true
});

// Batch create entities
const entities = Array.from({ length: 1000 }, (_, i) => ({
  type: 'Person',
  properties: { name: `Person ${i}`, id: i }
}));

const createdEntities = await batchProcessor.createEntities(graph.id, entities);

// Batch update entities  
const updates = createdEntities.map(entity => ({
  id: entity.id,
  data: { properties: { ...entity.properties, updated: true } }
}));

await batchProcessor.updateEntities(updates);
```

```python
# Python batch operations
from intelgraph.utils import BatchProcessor
import asyncio

async def batch_operations():
    client = IntelGraphClient(api_key=os.environ['INTELGRAPH_API_KEY'])
    processor = BatchProcessor(client, batch_size=50, max_concurrency=3)
    
    # Batch create entities
    entities_data = [
        {'type': 'Person', 'properties': {'name': f'Person {i}'}}
        for i in range(500)
    ]
    
    created_entities = await processor.create_entities_batch(
        'graph-id',
        entities_data
    )
    
    print(f"Created {len(created_entities)} entities in batches")

asyncio.run(batch_operations())
```

### Data Export/Import

```typescript
// Export graph data
const exporter = client.export.createExporter({
  format: 'json', // json, csv, neo4j, graphml
  includeMetadata: true,
  compression: 'gzip'
});

const exportData = await exporter.exportGraph(graph.id);

// Save to file
import fs from 'fs';
fs.writeFileSync('graph-export.json.gz', exportData);

// Import graph data
const importer = client.import.createImporter({
  format: 'json',
  mergeStrategy: 'upsert', // create, upsert, replace
  validateSchema: true
});

const importedGraph = await importer.importGraph(exportData);
```

### Monitoring and Observability

```typescript
// Enable SDK telemetry
const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  apiKey: process.env.INTELGRAPH_API_KEY,
  telemetry: {
    enabled: true,
    endpoint: 'https://telemetry.intelgraph.ai',
    sampleRate: 0.1, // Sample 10% of requests
    includeRequestBodies: false, // For privacy
  }
});

// Custom metrics
client.metrics.recordCustomMetric('graph_processing_time', 1250, {
  graph_id: graph.id,
  operation: 'entity_creation',
  batch_size: 100
});

// Performance monitoring
const timer = client.metrics.startTimer('complex_operation');
try {
  // Perform complex operation
  await performComplexOperation();
  timer.end({ success: true });
} catch (error) {
  timer.end({ success: false, error: error.name });
}
```

## Best Practices

### Performance Optimization

```typescript
// Use pagination for large datasets
async function processLargeGraph(graphId: string) {
  let page = 1;
  const pageSize = 1000;
  
  while (true) {
    const entities = await client.entities.list(graphId, {
      page,
      limit: pageSize
    });
    
    if (entities.data.length === 0) break;
    
    // Process batch
    await processBatch(entities.data);
    
    if (!entities.pagination.hasNext) break;
    page++;
  }
}

// Connection pooling for high-throughput scenarios
const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  apiKey: process.env.INTELGRAPH_API_KEY,
  connectionPool: {
    maxConnections: 20,
    keepAlive: true,
    timeout: 30000
  }
});
```

### Security Best Practices

```typescript
// Secure API key management
import { SecretManager } from '@google-cloud/secret-manager';

const secretManager = new SecretManager();

async function getSecureApiKey() {
  const [version] = await secretManager.accessSecretVersion({
    name: 'projects/project-id/secrets/intelgraph-api-key/versions/latest'
  });
  
  return version.payload?.data?.toString();
}

const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  apiKey: await getSecureApiKey(),
  // Enable request signing for additional security
  requestSigning: {
    enabled: true,
    algorithm: 'HMAC-SHA256',
    secretKey: process.env.SIGNING_SECRET
  }
});
```

### Error Recovery

```typescript
// Exponential backoff retry
import { ExponentialBackoff } from '@intelgraph/sdk/utils';

const backoff = new ExponentialBackoff({
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  maxAttempts: 5
});

async function resilientOperation() {
  return backoff.execute(async () => {
    try {
      return await client.graphs.create(graphData);
    } catch (error) {
      if (error.status >= 500) {
        throw error; // Retry server errors
      }
      throw new Error('Stop retrying'); // Don't retry client errors
    }
  });
}
```

## Migration Guides

### Upgrading from v1.x to v2.x

```typescript
// v1.x (deprecated)
const client = new IntelGraph({
  endpoint: 'https://api.intelgraph.ai/v1',
  token: 'your-token'
});

const graph = await client.createGraph({
  title: 'My Graph',
  desc: 'Description'
});

// v2.x (current)
const client = new IntelGraphClient({
  apiUrl: 'https://api.intelgraph.ai/v2',
  apiKey: 'your-api-key'
});

const graph = await client.graphs.create({
  name: 'My Graph', // Changed from 'title'
  description: 'Description' // Changed from 'desc'
});
```

### Breaking Changes

- **Authentication**: API keys replace JWT tokens for server-side usage
- **Endpoints**: All endpoints moved from `/v1` to `/v2`
- **Field names**: Various field name changes for consistency
- **Response format**: Standardized response wrapper with metadata
- **Error handling**: New exception hierarchy with specific error types

## Support and Resources

### API Reference
- [TypeScript SDK API Reference](https://docs.intelgraph.ai/sdk/typescript)
- [Python SDK API Reference](https://docs.intelgraph.ai/sdk/python)
- [REST API Documentation](../../openapi/)

### Examples and Tutorials
- [SDK Examples Repository](https://github.com/BrianCLong/intelgraph-sdk-examples)
- [Video Tutorials](https://www.youtube.com/intelgraph)
- [Interactive Playground](https://playground.intelgraph.ai)

### Community and Support
- **Documentation**: [docs.intelgraph.ai](https://docs.intelgraph.ai)
- **Discord Community**: [discord.gg/intelgraph](https://discord.gg/intelgraph)
- **GitHub Issues**: [github.com/BrianCLong/summit/issues](https://github.com/BrianCLong/summit/issues)
- **Stack Overflow**: Tag questions with `intelgraph`
- **Email Support**: sdk-support@intelgraph.ai

---

**Document Version**: 2.1.0  
**Last Updated**: $(date)  
**SDK Versions**: TypeScript v2.1.0, Python v2.1.0
