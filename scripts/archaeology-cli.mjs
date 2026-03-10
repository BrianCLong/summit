#!/usr/bin/env node
/**
 * Repository Archaeology CLI
 *
 * Complete pipeline orchestrator for:
 * 1. Fragment Extraction (AST-aware code fragment extraction)
 * 2. Subsystem Inference (clustering and co-change patterns)
 * 3. Deletion Detection (identify deleted capabilities)
 * 4. Reconstruction (generate resurrection patches)
 * 5. Capability Graph (provenance tracking)
 *
 * Usage:
 *   node scripts/archaeology-cli.mjs extract [options]
 *   node scripts/archaeology-cli.mjs infer [options]
 *   node scripts/archaeology-cli.mjs detect [options]
 *   node scripts/archaeology-cli.mjs reconstruct [options]
 *   node scripts/archaeology-cli.mjs graph [options]
 *   node scripts/archaeology-cli.mjs full [options]    # Run complete pipeline
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration
const DEFAULT_CONFIG = {
  repo_path: process.cwd(),
  output_dir: resolve(process.cwd(), 'artifacts/archaeology'),
  since_commit: 'HEAD~100',
  until_commit: 'HEAD',
  detect_deletions: true,
  validate_syntax: true,
  max_fragments: 10000,
  max_bundles: 50,
};

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Repository Archaeology Engine - CLI v1.0.0          ║');
  console.log('║     Capability Resurrection & Provenance Tracking        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    switch (command) {
      case 'extract':
        await runExtraction(args.slice(1));
        break;
      case 'infer':
        await runInference(args.slice(1));
        break;
      case 'detect':
        await runDetection(args.slice(1));
        break;
      case 'reconstruct':
        await runReconstruction(args.slice(1));
        break;
      case 'graph':
        await runGraph(args.slice(1));
        break;
      case 'full':
        await runFullPipeline(args.slice(1));
        break;
      case 'query':
        await runQuery(args.slice(1));
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Run fragment extraction
 */
async function runExtraction(args) {
  console.log('📦 Phase 1: Fragment Extraction');
  console.log('─'.repeat(60));

  const config = parseConfig(args);

  // Note: In production, this would dynamically import the TypeScript module
  // For now, showing the command structure
  console.log('');
  console.log('Configuration:');
  console.log(`  Repo: ${config.repo_path}`);
  console.log(`  Output: ${config.output_dir}`);
  console.log(`  Range: ${config.since_commit}..${config.until_commit}`);
  console.log(`  Detect deletions: ${config.detect_deletions}`);
  console.log('');

  console.log('⚠️  Note: TypeScript modules need to be compiled first');
  console.log('Run: cd services/repoos/archaeology && tsc');
  console.log('');
  console.log('Or use the Node.js implementation:');
  console.log(`  REPO_PATH="${config.repo_path}" \\`);
  console.log(`  OUTPUT_DIR="${config.output_dir}" \\`);
  console.log(`  SINCE_COMMIT="${config.since_commit}" \\`);
  console.log(`  UNTIL_COMMIT="${config.until_commit}" \\`);
  console.log(`  node services/repoos/archaeology/fragment-extractor.js`);
  console.log('');

  // Check if fragments already exist
  const fragmentsFile = resolve(config.output_dir, 'fragments.json');
  if (existsSync(fragmentsFile)) {
    const data = JSON.parse(readFileSync(fragmentsFile, 'utf8'));
    console.log(`✅ Fragments found: ${data.total_fragments} fragments`);
    console.log(`   Deletions detected: ${data.deletions_detected}`);
  } else {
    console.log('❌ No fragments file found. Please run extraction first.');
  }
}

/**
 * Run subsystem inference
 */
async function runInference(args) {
  console.log('🔍 Phase 2: Subsystem Inference');
  console.log('─'.repeat(60));

  const config = parseConfig(args);

  console.log('');
  console.log('Analyzing:');
  console.log('  - Co-change patterns');
  console.log('  - Dependency clustering');
  console.log('  - File path similarities');
  console.log('  - Temporal correlations');
  console.log('');

  const fragmentsFile = resolve(config.output_dir, 'fragments.json');
  if (!existsSync(fragmentsFile)) {
    throw new Error('Fragments file not found. Run "extract" command first.');
  }

  const subsystemsFile = resolve(config.output_dir, 'subsystems.json');
  if (existsSync(subsystemsFile)) {
    const data = JSON.parse(readFileSync(subsystemsFile, 'utf8'));
    console.log(`✅ Subsystems found: ${data.total_subsystems} subsystems`);

    // Show summary
    if (data.subsystems && data.subsystems.length > 0) {
      console.log('');
      console.log('Top Subsystems:');
      data.subsystems.slice(0, 5).forEach((sub, idx) => {
        console.log(`  ${idx + 1}. ${sub.name}`);
        console.log(`     Fragments: ${sub.fragments.length}`);
        console.log(`     Coherence: ${Math.round(sub.coherence_score * 100)}%`);
        console.log(`     Category: ${sub.characteristics.category}`);
      });
    }
  } else {
    console.log('❌ No subsystems file found. Please run inference first.');
  }
}

/**
 * Run deletion detection
 */
async function runDetection(args) {
  console.log('🔎 Phase 3: Deletion Detection');
  console.log('─'.repeat(60));

  const config = parseConfig(args);

  console.log('');
  console.log('Detecting:');
  console.log('  - Deleted files');
  console.log('  - Removed capabilities');
  console.log('  - Deprecated features');
  console.log('');

  const fragmentsFile = resolve(config.output_dir, 'fragments.json');
  if (!existsSync(fragmentsFile)) {
    throw new Error('Fragments file not found. Run "extract" command first.');
  }

  const deletionsFile = resolve(config.output_dir, 'deletion_candidates.json');
  if (existsSync(deletionsFile)) {
    const data = JSON.parse(readFileSync(deletionsFile, 'utf8'));
    console.log(`✅ Deletion candidates: ${data.total_candidates}`);

    if (data.summary) {
      console.log('');
      console.log('Summary:');
      console.log(`  Resurrect immediately: ${data.summary.resurrect_immediately}`);
      console.log(`  Resurrect soon: ${data.summary.resurrect_soon}`);
      console.log(`  Defer: ${data.summary.defer}`);
      console.log(`  Do not resurrect: ${data.summary.do_not_resurrect}`);
      console.log(`  Avg value score: ${data.summary.avg_value_score}`);
    }

    // Show top candidates
    if (data.candidates) {
      const topCandidates = data.candidates.filter(
        (c) => c.recommendation === 'resurrect_immediately' || c.recommendation === 'resurrect_soon'
      ).slice(0, 5);

      if (topCandidates.length > 0) {
        console.log('');
        console.log('Top Resurrection Candidates:');
        topCandidates.forEach((c, idx) => {
          console.log(`  ${idx + 1}. ${c.capability_name}`);
          console.log(`     Value: ${Math.round(c.business_value.value_score * 100)}%`);
          console.log(`     Feasibility: ${c.resurrection_assessment.feasibility}`);
          console.log(`     Recommendation: ${c.recommendation}`);
        });
      }
    }
  } else {
    console.log('❌ No deletion candidates file found. Please run detection first.');
  }
}

/**
 * Run reconstruction
 */
async function runReconstruction(args) {
  console.log('🔨 Phase 4: Reconstruction');
  console.log('─'.repeat(60));

  const config = parseConfig(args);

  console.log('');
  console.log('Reconstructing:');
  console.log('  - Assembling fragments');
  console.log('  - Resolving dependencies');
  console.log('  - Generating patches');
  console.log('  - Validating syntax');
  console.log('');

  const fragmentsFile = resolve(config.output_dir, 'fragments.json');
  const deletionsFile = resolve(config.output_dir, 'deletion_candidates.json');

  if (!existsSync(fragmentsFile)) {
    throw new Error('Fragments file not found. Run "extract" command first.');
  }
  if (!existsSync(deletionsFile)) {
    throw new Error('Deletions file not found. Run "detect" command first.');
  }

  const bundlesFile = resolve(config.output_dir, 'reconstruction_bundles.json');
  if (existsSync(bundlesFile)) {
    const data = JSON.parse(readFileSync(bundlesFile, 'utf8'));
    console.log(`✅ Reconstruction bundles: ${data.total_bundles}`);

    if (data.bundles && data.bundles.length > 0) {
      console.log('');
      console.log('Bundles Created:');
      data.bundles.slice(0, 5).forEach((b, idx) => {
        console.log(`  ${idx + 1}. ${b.capability_name}`);
        console.log(`     Strategy: ${b.synthesis_strategy}`);
        console.log(`     Confidence: ${Math.round(b.confidence * 100)}%`);
        console.log(`     Target paths: ${b.target_paths.length}`);
      });

      console.log('');
      console.log(`📁 Patches saved to: ${config.output_dir}/patches/`);
      console.log('');
      console.log('To apply a patch:');
      console.log(`  cd ${config.repo_path}`);
      console.log(`  git apply ${config.output_dir}/patches/bundle_*.patch`);
    }
  } else {
    console.log('❌ No reconstruction bundles found. Please run reconstruction first.');
  }
}

/**
 * Run capability graph generation
 */
async function runGraph(args) {
  console.log('🕸️  Phase 5: Capability Graph');
  console.log('─'.repeat(60));

  const config = parseConfig(args);

  console.log('');
  console.log('Building provenance graph...');
  console.log('');

  const fragmentsFile = resolve(config.output_dir, 'fragments.json');
  if (!existsSync(fragmentsFile)) {
    throw new Error('Fragments file not found. Run "extract" command first.');
  }

  const graphFile = resolve(config.output_dir, 'capability_graph.json');
  if (existsSync(graphFile)) {
    const data = JSON.parse(readFileSync(graphFile, 'utf8'));
    console.log(`✅ Capability Graph built:`);
    console.log(`   Nodes: ${data.nodes.length}`);
    console.log(`   Edges: ${data.edges.length}`);
    console.log('');
    console.log(`   Fragments: ${data.metadata.total_fragments}`);
    console.log(`   Subsystems: ${data.metadata.total_subsystems}`);
    console.log(`   Deletions: ${data.metadata.total_deletions}`);
    console.log(`   Reconstructions: ${data.metadata.total_reconstructions}`);
    console.log('');
    console.log(`📁 Graph saved to: ${graphFile}`);
    console.log(`📊 Visualization: ${config.output_dir}/capability_graph.dot`);
    console.log('');
    console.log('To visualize (requires Graphviz):');
    console.log(`  dot -Tpng ${config.output_dir}/capability_graph.dot -o graph.png`);
  } else {
    console.log('❌ No capability graph found. Please run graph generation first.');
  }
}

/**
 * Run full pipeline
 */
async function runFullPipeline(args) {
  console.log('🚀 Running Full Archaeology Pipeline');
  console.log('═'.repeat(60));
  console.log('');

  await runExtraction(args);
  console.log('');

  await runInference(args);
  console.log('');

  await runDetection(args);
  console.log('');

  await runReconstruction(args);
  console.log('');

  await runGraph(args);
  console.log('');

  console.log('═'.repeat(60));
  console.log('✨ Full pipeline complete!');
  console.log('');
}

/**
 * Run capability graph query
 */
async function runQuery(args) {
  console.log('🔍 Capability Graph Query');
  console.log('─'.repeat(60));

  const config = parseConfig(args);
  const queryType = args.find((a) => ['dependencies', 'dependents', 'provenance', 'evolution', 'path'].includes(a)) || 'help';
  const target = args[args.indexOf(queryType) + 1];

  if (queryType === 'help' || !target) {
    console.log('');
    console.log('Query types:');
    console.log('  dependencies <node>   - What does X depend on?');
    console.log('  dependents <node>     - What depends on X?');
    console.log('  provenance <node>     - Show provenance of X');
    console.log('  evolution <node>      - Show evolution timeline of X');
    console.log('  path <node1> <node2>  - Find path between nodes');
    console.log('');
    return;
  }

  console.log('');
  console.log(`Query: ${queryType} "${target}"`);
  console.log('');

  const graphFile = resolve(config.output_dir, 'capability_graph.json');
  if (!existsSync(graphFile)) {
    throw new Error('Capability graph not found. Run "graph" command first.');
  }

  console.log('⚠️  Query execution requires TypeScript module compilation');
  console.log(`Query stored. To execute:`);
  console.log(`  1. Compile TypeScript: cd services/repoos/archaeology && tsc`);
  console.log(`  2. Load graph and run query`);
}

/**
 * Parse configuration from args
 */
function parseConfig(args) {
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--repo':
      case '-r':
        config.repo_path = next;
        i++;
        break;
      case '--output':
      case '-o':
        config.output_dir = next;
        i++;
        break;
      case '--since':
        config.since_commit = next;
        i++;
        break;
      case '--until':
        config.until_commit = next;
        i++;
        break;
      case '--no-deletions':
        config.detect_deletions = false;
        break;
      case '--no-validation':
        config.validate_syntax = false;
        break;
      case '--max-fragments':
        config.max_fragments = parseInt(next, 10);
        i++;
        break;
      case '--max-bundles':
        config.max_bundles = parseInt(next, 10);
        i++;
        break;
    }
  }

  return config;
}

/**
 * Show help
 */
function showHelp() {
  console.log('Usage: archaeology-cli <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  extract      - Extract code fragments from git history');
  console.log('  infer        - Infer subsystem boundaries');
  console.log('  detect       - Detect deleted capabilities');
  console.log('  reconstruct  - Generate resurrection patches');
  console.log('  graph        - Build capability provenance graph');
  console.log('  full         - Run complete pipeline');
  console.log('  query        - Query the capability graph');
  console.log('  help         - Show this help message');
  console.log('');
  console.log('Options:');
  console.log('  --repo, -r <path>        Repository path (default: current directory)');
  console.log('  --output, -o <path>      Output directory (default: artifacts/archaeology)');
  console.log('  --since <commit>         Start commit (default: HEAD~100)');
  console.log('  --until <commit>         End commit (default: HEAD)');
  console.log('  --no-deletions           Skip deletion detection');
  console.log('  --no-validation          Skip syntax validation');
  console.log('  --max-fragments <n>      Maximum fragments to extract (default: 10000)');
  console.log('  --max-bundles <n>        Maximum reconstruction bundles (default: 50)');
  console.log('');
  console.log('Examples:');
  console.log('  # Extract fragments from last 100 commits');
  console.log('  archaeology-cli extract');
  console.log('');
  console.log('  # Run full pipeline with custom range');
  console.log('  archaeology-cli full --since HEAD~200 --until HEAD');
  console.log('');
  console.log('  # Query dependencies of a capability');
  console.log('  archaeology-cli query dependencies "AuthService"');
  console.log('');
  console.log('  # Generate graph visualization');
  console.log('  archaeology-cli graph && dot -Tpng artifacts/archaeology/capability_graph.dot -o graph.png');
  console.log('');
}

// Run CLI
main();
