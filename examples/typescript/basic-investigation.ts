/**
 * Basic Investigation Example - TypeScript
 *
 * This example demonstrates how to:
 * 1. Create a new investigation graph
 * 2. Add entities (people, organizations)
 * 3. Create relationships between entities
 * 4. Run AI-powered community detection
 * 5. Query the graph
 */

import { IntelGraphClient } from '@intelgraph/sdk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  apiKey: string;
  baseUrl: string;
}

async function main() {
  // Initialize the client
  const config: Config = {
    apiKey: process.env.INTELGRAPH_API_KEY || '',
    baseUrl: process.env.INTELGRAPH_BASE_URL || 'https://api.intelgraph.ai',
  };

  if (!config.apiKey) {
    throw new Error('INTELGRAPH_API_KEY environment variable is required');
  }

  const client = new IntelGraphClient(config);

  console.log('🚀 Creating new investigation...');

  // Step 1: Create a graph for the investigation
  const graph = await client.graphs.create({
    name: 'Financial Fraud Investigation - Q4 2024',
    description: 'Investigation into suspicious financial transactions',
    tags: ['fraud', 'financial', 'q4-2024'],
    configuration: {
      layout: 'force-directed',
      theme: 'dark',
      autoSave: true,
    },
  });

  console.log(`✅ Created graph: ${graph.id}`);
  console.log(`   Name: ${graph.name}`);

  // Step 2: Add entities (suspects, organizations, accounts)
  console.log('\n👤 Adding entities...');

  const suspect1 = await client.entities.create(graph.id, {
    type: 'Person',
    properties: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      dateOfBirth: '1980-05-15',
      nationality: 'US',
      role: 'Suspect',
    },
    metadata: {
      source: 'OSINT',
      confidence: 0.85,
      lastVerified: new Date().toISOString(),
    },
  });

  console.log(`   ✓ Added: ${suspect1.properties.name} (${suspect1.id})`);

  const suspect2 = await client.entities.create(graph.id, {
    type: 'Person',
    properties: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      dateOfBirth: '1975-08-22',
      nationality: 'UK',
      role: 'Suspect',
    },
    metadata: {
      source: 'Financial Records',
      confidence: 0.92,
    },
  });

  console.log(`   ✓ Added: ${suspect2.properties.name} (${suspect2.id})`);

  const organization = await client.entities.create(graph.id, {
    type: 'Organization',
    properties: {
      name: 'Offshore Holdings LLC',
      registrationNumber: 'OH-2024-5678',
      jurisdiction: 'Cayman Islands',
      type: 'Shell Company',
    },
    metadata: {
      source: 'Corporate Registry',
      confidence: 0.95,
    },
  });

  console.log(`   ✓ Added: ${organization.properties.name} (${organization.id})`);

  const account = await client.entities.create(graph.id, {
    type: 'BankAccount',
    properties: {
      accountNumber: '****1234',
      bank: 'International Trust Bank',
      currency: 'USD',
      status: 'Active',
    },
    metadata: {
      source: 'Financial Intelligence Unit',
      confidence: 0.98,
    },
  });

  console.log(`   ✓ Added: Bank Account (${account.id})`);

  // Step 3: Create relationships
  console.log('\n🔗 Creating relationships...');

  const rel1 = await client.relationships.create(graph.id, {
    type: 'WORKS_FOR',
    sourceId: suspect1.id,
    targetId: organization.id,
    properties: {
      position: 'Director',
      startDate: '2020-01-15',
      salary: 250000,
    },
    metadata: {
      source: 'Employment Records',
      confidence: 0.90,
    },
  });

  console.log(`   ✓ ${suspect1.properties.name} → WORKS_FOR → ${organization.properties.name}`);

  const rel2 = await client.relationships.create(graph.id, {
    type: 'CONTROLS',
    sourceId: organization.id,
    targetId: account.id,
    properties: {
      controlLevel: 'Full',
      startDate: '2020-02-01',
    },
  });

  console.log(`   ✓ ${organization.properties.name} → CONTROLS → Bank Account`);

  const rel3 = await client.relationships.create(graph.id, {
    type: 'KNOWS',
    sourceId: suspect1.id,
    targetId: suspect2.id,
    properties: {
      relationshipType: 'Business Associate',
      since: '2019-06-01',
      frequency: 'Frequent',
    },
  });

  console.log(`   ✓ ${suspect1.properties.name} → KNOWS → ${suspect2.properties.name}`);

  // Step 4: Query entities
  console.log('\n🔍 Querying entities...');

  const peopleEntities = await client.entities.list(graph.id, {
    type: 'Person',
    limit: 10,
  });

  console.log(`   Found ${peopleEntities.data.length} person entities`);
  peopleEntities.data.forEach((entity) => {
    console.log(`   - ${entity.properties.name}`);
  });

  // Step 5: Execute custom graph query (Cypher)
  console.log('\n📊 Running custom graph query...');

  const queryResult = await client.graphs.query(graph.id, {
    query: `
      MATCH (p:Person)-[r:KNOWS]->(p2:Person)
      RETURN p.name as person1, p2.name as person2, r.relationshipType as relationship
    `,
    includeMetrics: true,
  });

  console.log(`   Query returned ${queryResult.data.length} results`);
  console.log(`   Execution time: ${queryResult.stats.executionTime}ms`);

  if (queryResult.data.length > 0) {
    queryResult.data.forEach((row) => {
      console.log(`   - ${row.person1} knows ${row.person2} (${row.relationship})`);
    });
  }

  // Step 6: Run AI-powered community detection
  console.log('\n🤖 Running AI community detection...');

  const analysisJob = await client.ai.analyze({
    graphId: graph.id,
    analysisType: 'community_detection',
    parameters: {
      algorithm: 'louvain',
      resolution: 1.0,
    },
  });

  console.log(`   Analysis job started: ${analysisJob.jobId}`);
  console.log(`   Status: ${analysisJob.status}`);

  // Poll for results (with timeout)
  console.log('   Waiting for analysis to complete...');

  try {
    const results = await client.ai.waitForJob(analysisJob.jobId, {
      pollingInterval: 2000, // 2 seconds
      timeout: 60000, // 1 minute
    });

    console.log('\n✅ Analysis complete!');
    console.log(`   Analysis type: ${results.analysisType}`);
    console.log(`   Execution time: ${results.executionTime}ms`);

    if (results.results.communities) {
      console.log(`   Communities found: ${results.results.communities.length}`);
      results.results.communities.forEach((community: any, index: number) => {
        console.log(`   Community ${index + 1}: ${community.size} members (density: ${community.density.toFixed(2)})`);
      });
    }

    if (results.insights && results.insights.length > 0) {
      console.log('\n💡 Key Insights:');
      results.insights.forEach((insight: any) => {
        console.log(`   - [${insight.type}] ${insight.description} (confidence: ${(insight.confidence * 100).toFixed(0)}%)`);
      });
    }
  } catch (error) {
    console.error('   ⚠️ Analysis timed out or failed:', error);
  }

  // Step 7: Get graph summary
  console.log('\n📈 Graph Summary:');
  const graphDetails = await client.graphs.get(graph.id);
  console.log(`   Nodes: ${graphDetails.nodeCount}`);
  console.log(`   Edges: ${graphDetails.edgeCount}`);
  console.log(`   Density: ${graphDetails.statistics.density.toFixed(4)}`);
  console.log(`   Average Degree: ${graphDetails.statistics.averageDegree.toFixed(2)}`);
  console.log(`   Clustering Coefficient: ${graphDetails.statistics.clusteringCoefficient.toFixed(4)}`);

  console.log('\n✨ Investigation setup complete!');
  console.log(`   Graph ID: ${graph.id}`);
  console.log(`   View in console: https://console.intelgraph.ai/graphs/${graph.id}`);
}

// Run the example
main()
  .then(() => {
    console.log('\n✅ Example completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    if (error.traceId) {
      console.error(`   Trace ID: ${error.traceId}`);
    }
    process.exit(1);
  });
