#!/usr/bin/env node
import { mockRetrieve, assembleContext } from './core.js';
import { ProvenanceRecorder } from './provenance.js';
import { validateModelConfig } from './config.js';
import { GraphRAGConfigSchema, GraphRAGInput } from './types.js';

async function main() {
  const args = process.argv.slice(2);
  const query = args[0] || "What is the policy on data retention?";

  console.log(`\n=== GraphRAG CLI ===`);
  console.log(`Query: "${query}"\n`);

  // Default Config
  const config = GraphRAGConfigSchema.parse({});

  // Security Check: Model Allowlist
  try {
    validateModelConfig(config);
  } catch (e: any) {
    console.error(`Security Error: ${e.message}`);
    process.exit(1);
  }

  const input: GraphRAGInput = {
    query,
    config
  };

  // Mock Data
  const mockData = {
    nodes: [
      { id: '1', label: 'Policy', properties: { text: 'Retention is 7 years' }, trust_level: 'trusted' as const },
      { id: '2', label: 'Person', properties: { text: 'John Doe' }, trust_level: 'untrusted' as const }
    ],
    edges: []
  };

  const recorder = new ProvenanceRecorder();
  recorder.start(input);

  console.log('1. Running Retrieval...');
  const retrieval = await mockRetrieve(query, mockData);
  recorder.recordRetrieval(retrieval);

  console.log(`   Found ${retrieval.ranked_candidates.length} candidates.`);

  console.log('2. Assembling Context...');
  const context = assembleContext(retrieval);
  recorder.recordContext(context);

  console.log(`   Payload Hash: ${context.content_hash}`);
  console.log(`   Payload Preview: ${context.payload.replace(/\n/g, ' ')}`);

  console.log('3. Simulating Model Invocation...');
  recorder.recordModelInvocation({
    provider: 'openai',
    model: config.model,
    prompt_tokens: 100,
    completion_tokens: 50
  });

  const output = {
    answer: "Data retention is 7 years.",
    citations: [{ node_id: '1', text: 'Retention is 7 years' }],
    confidence: 0.95
  };
  recorder.recordOutput(output);

  console.log(`\n=== Final Answer ===`);
  console.log(output.answer);

  const provenance = recorder.finalize();
  console.log(`\n[Provenance Record Generated: Run ID ${provenance.run_id}]`);
  console.log(JSON.stringify(provenance, null, 2));
}

main().catch(console.error);
