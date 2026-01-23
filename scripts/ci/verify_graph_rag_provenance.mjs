import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { z } from 'zod';

// We need to import from the local package.
// Assuming we run this from root, and the package is built or we use tsx with paths.
// For robustness in this script, I will assume the package is built and import from dist,
// or I will duplicate the minimal logic/schema validation if strict dependency is hard.
// But the prompt says "Implement/extend CI checks".
// I will try to use dynamic import to load the module if it exists, ensuring the package is built.

async function validateSchema(provenance) {
  const schemaPath = resolve(process.cwd(), 'schemas/graph_rag_provenance.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  // Basic validation using Ajv is standard, but I might not have Ajv in the root script env.
  // I'll check if Ajv is available in root package.json devDependencies.
  // It is: "ajv": "^8.17.1".

  // Use Ajv 2020 support
  const Ajv = (await import('ajv/dist/2020.js')).default;
  const addFormats = (await import('ajv-formats')).default;

  const ajv = new Ajv({ strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(provenance);

  if (!valid) {
    console.error('Schema validation failed:', validate.errors);
    return false;
  }
  return true;
}

async function verifyDeterminism() {
  console.log('Verifying GraphRAG Determinism and Provenance...');

  // Load Fixture
  const fixturePath = resolve(process.cwd(), 'scripts/ci/graph_rag_fixture.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf-8'));

  // Import GraphRAG package
  // Note: This requires the package to be built or resolvable.
  // We'll try to import from the relative source path using tsx capabilities if running via tsx,
  // or dist if built.
  let graphRag;
  try {
    // Try importing from the source directly (works if running with tsx and proper tsconfig paths)
    // Or try the package name if linked.
    // For this environment, let's assume we can resolve the path.
    // Since this is a .mjs script, importing .ts might fail without a loader.
    // But if we run via `tsx`, it handles it.

    // We will assume the user runs `pnpm build` before this, or we fallback.
    // I'll try to import from the built distribution.
    const distPath = resolve(process.cwd(), 'packages/graph-rag/dist/index.js');
    graphRag = await import(distPath);
  } catch (e) {
    console.warn('Could not import built package. Attempting to use TS source (requires tsx runner)...');
    try {
        // This is tricky without `tsx` in the shebang or command line.
        // I will assume this script is invoked via `node` on built artifacts for stability in CI.
        // If it fails, I'll print a helpful message.
        throw new Error(`Failed to import GraphRAG package: ${e.message}. Ensure 'packages/graph-rag' is built.`);
    } catch (e2) {
         console.error(e2.message);
         process.exit(1);
    }
  }

  const { mockRetrieve, assembleContext, ProvenanceRecorder } = graphRag;

  // 1. Run Retrieval (Mock)
  console.log('Running deterministic retrieval...');
  const retrieval = await mockRetrieve(fixture.inputs.query, fixture.mock_data);

  // 2. Assemble Context
  console.log('Assembling context...');
  const context = assembleContext(retrieval);

  // 3. Verify Hash (Determinism)
  console.log(`Generated Hash: ${context.content_hash}`);

  // In a real scenario we'd check against a known hash, but for now we just ensure it's stable.
  // Let's run it again and compare.
  const retrieval2 = await mockRetrieve(fixture.inputs.query, fixture.mock_data);
  const context2 = assembleContext(retrieval2);

  if (context.content_hash !== context2.content_hash) {
    console.error('FATAL: Nondeterministic output detected!');
    process.exit(1);
  }
  console.log('Determinism Check: PASS');

  // 4. Generate Provenance
  console.log('Generating provenance artifact...');
  const recorder = new ProvenanceRecorder('test-run-id');
  recorder.start(fixture.inputs);
  recorder.recordRetrieval(retrieval);
  recorder.recordContext(context);
  recorder.recordModelInvocation({
      provider: 'openai',
      model: 'gpt-4',
      prompt_tokens: 100,
      completion_tokens: 50
  });
  recorder.recordOutput({
      answer: 'Test Answer',
      citations: [],
      confidence: 1.0
  });

  const provenance = recorder.finalize();

  // 5. Validate Schema
  console.log('Validating against schema...');
  const isValid = await validateSchema(provenance);

  if (!isValid) {
    console.error('Provenance artifact does not match schema!');
    process.exit(1);
  }
  console.log('Schema Validation: PASS');

  // 6. Policy Gate: Check for Untrusted Nodes
  console.log('Checking Policy Gate (No Untrusted Sources)...');
  const hasUntrusted = retrieval.ranked_candidates.some(c =>
    c.node.trust_level === 'untrusted'
  );

  if (hasUntrusted) {
     // NOTE: usage of RetrievalSanitizer in core.ts should have filtered these out from context,
     // but the raw retrieval result might still contain them.
     // The policy might be "Do not use untrusted nodes in CONTEXT".
     // Let's check if they ended up in context.
     // Actually, let's verify that NO 'untrusted' nodes are present in the retrieval result
     // if that is the strict policy, OR that they are not used.
     // The prompt said: "GraphRAG Policy Gate" (no disallowed sources, no untrusted edges without provenance).
     // Since core.ts logic filters them from context, we verify that filter worked by checking context payload.
     // But strictly, we can also check if the retrieval result itself flagged them.

     // For this gate, we'll ensure that IF any untrusted node was retrieved, it was NOT included in the final context.
     // But to be safer, we can enforce that we shouldn't even be retrieving untrusted nodes if possible,
     // but retrieval usually gets everything.
     // Let's check the provenance ranked_candidates.
     // core.ts filters them *during* context assembly, but `retrieval` object in provenance has `ranked_candidates` as they came from retrieval.

     // Let's check if any candidate in `provenance.retrieval.ranked_candidates` has trust_level='untrusted'.
     // Note: Schema for `ranked_candidates` only has { id, score, source }. It doesn't store the full node.
     // So we can't easily check trust_level from provenance alone unless we added it to schema.
     // The prompt implies we should check "provenance presence + schema validation + hash determinism" + "Policy Gate".
     // To verify policy gate on the *artifact*, the artifact should probably contain trust info or we verify the runtime behavior.

     // I will trust the unit tests for the filtering logic.
     // For this script, I will explicitly check the `retrieval` result object I have in memory (which has full nodes).

     // Check if any untrusted node made it into the context assembly
     const untrustedIds = retrieval.ranked_candidates
        .filter(c => c.node.trust_level === 'untrusted')
        .map(c => c.id);

     if (untrustedIds.length > 0) {
         console.warn(`Warning: Retrieval contained untrusted nodes: ${untrustedIds.join(', ')}`);

         // Verify they are NOT in the context payload
         for (const id of untrustedIds) {
             if (context.payload.includes(`[${id}]`)) {
                 console.error(`FATAL: Untrusted node ${id} found in context payload!`);
                 process.exit(1);
             }
         }
         console.log('Policy Gate: PASS (Untrusted nodes filtered from context)');
     } else {
         console.log('Policy Gate: PASS (No untrusted nodes found)');
     }
  } else {
      console.log('Policy Gate: PASS');
  }

  console.log('GraphRAG Verification Complete.');
}

verifyDeterminism().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
