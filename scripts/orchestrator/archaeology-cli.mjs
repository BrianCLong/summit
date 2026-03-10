#!/usr/bin/env node

/**
 * Repository Archaeology CLI - Complete Pipeline Orchestrator
 *
 * Commands:
 *   extract      - Extract fragments from git history
 *   infer        - Infer subsystem boundaries
 *   detect       - Detect deleted capabilities
 *   reconstruct  - Generate resurrection patches
 *   graph        - Build capability provenance graph
 *   query        - Query the capability graph
 *   full         - Run complete pipeline
 *
 * @module archaeology-cli
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  repoPath: process.cwd(),
  outputPath: 'artifacts/archaeology',
  sinceCommit: 'HEAD~100',
  untilCommit: 'HEAD',
  maxFragments: 10000,
  maxBundles: 50,
  noDeletions: false,
  noValidation: false,
  evolutionLedgerPath: 'artifacts/evolution/ledger.jsonl',
  homeostasisSignalsPath: 'artifacts/evolution/signals.jsonl'
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const config = { ...DEFAULT_CONFIG };
  const queryParams = {};

  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--repo':
      case '-r':
        config.repoPath = value;
        break;
      case '--output':
      case '-o':
        config.outputPath = value;
        break;
      case '--since':
        config.sinceCommit = value;
        break;
      case '--until':
        config.untilCommit = value;
        break;
      case '--max-fragments':
        config.maxFragments = parseInt(value, 10);
        break;
      case '--max-bundles':
        config.maxBundles = parseInt(value, 10);
        break;
      case '--no-deletions':
        config.noDeletions = true;
        i--; // Flag only
        break;
      case '--no-validation':
        config.noValidation = true;
        i--; // Flag only
        break;
      case '--query-type':
        queryParams.type = value;
        break;
      case '--node-id':
        queryParams.nodeId = value;
        break;
      case '--max-depth':
        queryParams.maxDepth = parseInt(value, 10);
        break;
      default:
        if (flag.startsWith('--')) {
          console.error(`Unknown flag: ${flag}`);
          process.exit(1);
        }
    }
  }

  return { command, config, queryParams };
}

// ============================================================================
// Phase Runners
// ============================================================================

/**
 * Phase 1: Extract fragments
 */
async function runExtraction(config) {
  console.log('🔍 Phase 1: Fragment Extraction');
  console.log(`   Repository: ${config.repoPath}`);
  console.log(`   Commit range: ${config.sinceCommit}..${config.untilCommit}`);
  console.log('');

  const result = await runTypeScriptModule('fragment-extractor', config, {
    repo_path: config.repoPath,
    output_path: config.outputPath,
    since_commit: config.sinceCommit,
    until_commit: config.untilCommit,
    max_fragments: config.maxFragments,
    track_deletions: !config.noDeletions
  });

  // Load and display summary
  const fragmentsFile = path.join(config.outputPath, 'fragments.json');
  if (fs.existsSync(fragmentsFile)) {
    const data = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));
    console.log(`✅ Extracted ${data.metadata.total_fragments} fragments`);
    console.log(`   Deletions: ${data.metadata.total_deletions}`);
    return data;
  }

  throw new Error('Fragment extraction failed');
}

/**
 * Phase 2: Infer subsystems
 */
async function runInference(config) {
  console.log('🔍 Phase 2: Subsystem Inference');

  const fragmentsFile = path.join(config.outputPath, 'fragments.json');
  if (!fs.existsSync(fragmentsFile)) {
    throw new Error('fragments.json not found. Run extraction first.');
  }

  const fragmentsData = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));

  const result = await runTypeScriptModule('subsystem-inference', config, {
    fragments: fragmentsData.fragments,
    output_path: config.outputPath
  });

  const subsystemsFile = path.join(config.outputPath, 'subsystems.json');
  if (fs.existsSync(subsystemsFile)) {
    const data = JSON.parse(fs.readFileSync(subsystemsFile, 'utf8'));
    console.log(`✅ Inferred ${data.metadata.total_subsystems} subsystems`);
    console.log(`   Avg subsystem size: ${data.metadata.avg_subsystem_size.toFixed(1)} fragments`);
    return data;
  }

  throw new Error('Subsystem inference failed');
}

/**
 * Phase 3: Detect deletions
 */
async function runDetection(config) {
  console.log('🔍 Phase 3: Deletion Detection');

  const fragmentsFile = path.join(config.outputPath, 'fragments.json');
  const subsystemsFile = path.join(config.outputPath, 'subsystems.json');

  if (!fs.existsSync(fragmentsFile)) {
    throw new Error('fragments.json not found. Run extraction first.');
  }

  const fragmentsData = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));
  const subsystemsData = fs.existsSync(subsystemsFile)
    ? JSON.parse(fs.readFileSync(subsystemsFile, 'utf8'))
    : { subsystems: [] };

  const result = await runTypeScriptModule('partial-deletion-detector', config, {
    fragments: fragmentsData.fragments,
    subsystems: subsystemsData.subsystems,
    output_path: config.outputPath
  });

  const candidatesFile = path.join(config.outputPath, 'deletion_candidates.json');
  if (fs.existsSync(candidatesFile)) {
    const data = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
    console.log(`✅ Detected ${data.metadata.total_candidates} deletion candidates`);
    console.log(`   High priority: ${data.metadata.high_priority_count}`);
    console.log(`   Immediate resurrection: ${data.metadata.immediate_resurrection_count}`);

    // Display top 3 candidates
    if (data.candidates.length > 0) {
      console.log('\n📋 Top Candidates:');
      for (let i = 0; i < Math.min(3, data.candidates.length); i++) {
        const c = data.candidates[i];
        console.log(`   ${i + 1}. ${c.capability_name} (value: ${c.business_value.value_score.toFixed(2)}, ${c.recommendation})`);
      }
    }

    return data;
  }

  throw new Error('Deletion detection failed');
}

/**
 * Phase 4: Reconstruct capabilities
 */
async function runReconstruction(config) {
  console.log('🔨 Phase 4: Capability Reconstruction');

  const fragmentsFile = path.join(config.outputPath, 'fragments.json');
  const candidatesFile = path.join(config.outputPath, 'deletion_candidates.json');

  if (!fs.existsSync(fragmentsFile)) {
    throw new Error('fragments.json not found. Run extraction first.');
  }
  if (!fs.existsSync(candidatesFile)) {
    throw new Error('deletion_candidates.json not found. Run detection first.');
  }

  const fragmentsData = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));
  const candidatesData = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));

  const patchDir = path.join(config.outputPath, 'patches');
  fs.mkdirSync(patchDir, { recursive: true });

  const result = await runTypeScriptModule('reconstruction-engine', config, {
    candidates: candidatesData.candidates,
    fragments: fragmentsData.fragments,
    output_patch_dir: patchDir,
    validate_syntax: !config.noValidation,
    max_bundles: config.maxBundles
  });

  const bundlesFile = path.join(config.outputPath, 'reconstruction_bundles.json');
  if (fs.existsSync(bundlesFile)) {
    const data = JSON.parse(fs.readFileSync(bundlesFile, 'utf8'));
    console.log(`✅ Reconstructed ${data.metadata.successful_reconstructions} capabilities`);
    console.log(`   Failed: ${data.metadata.failed_reconstructions}`);
    console.log(`   Avg confidence: ${data.metadata.avg_confidence.toFixed(2)}`);
    console.log(`   Patches: ${patchDir}`);

    return data;
  }

  throw new Error('Reconstruction failed');
}

/**
 * Phase 5: Build capability graph
 */
async function runGraphBuild(config) {
  console.log('📊 Phase 5: Capability Graph Building');

  const fragmentsFile = path.join(config.outputPath, 'fragments.json');
  if (!fs.existsSync(fragmentsFile)) {
    throw new Error('fragments.json not found. Run extraction first.');
  }

  const fragmentsData = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));

  const subsystemsFile = path.join(config.outputPath, 'subsystems.json');
  const subsystemsData = fs.existsSync(subsystemsFile)
    ? JSON.parse(fs.readFileSync(subsystemsFile, 'utf8'))
    : { subsystems: [] };

  const candidatesFile = path.join(config.outputPath, 'deletion_candidates.json');
  const candidatesData = fs.existsSync(candidatesFile)
    ? JSON.parse(fs.readFileSync(candidatesFile, 'utf8'))
    : { candidates: [] };

  const bundlesFile = path.join(config.outputPath, 'reconstruction_bundles.json');
  const bundlesData = fs.existsSync(bundlesFile)
    ? JSON.parse(fs.readFileSync(bundlesFile, 'utf8'))
    : { bundles: [] };

  const result = await runTypeScriptModule('capability-graph', config, {
    fragments: fragmentsData.fragments,
    subsystems: subsystemsData.subsystems,
    deletions: candidatesData.candidates,
    reconstructions: bundlesData.bundles,
    output_path: config.outputPath
  });

  const graphFile = path.join(config.outputPath, 'capability_graph.json');
  const dotFile = path.join(config.outputPath, 'capability_graph.dot');

  if (fs.existsSync(graphFile)) {
    const data = JSON.parse(fs.readFileSync(graphFile, 'utf8'));
    console.log(`✅ Built capability graph`);
    console.log(`   Nodes: ${data.nodes.length}`);
    console.log(`   Edges: ${data.edges.length}`);
    console.log(`   DOT file: ${dotFile}`);
    console.log(`   Visualize: dot -Tpng ${dotFile} -o graph.png`);

    return data;
  }

  throw new Error('Graph building failed');
}

/**
 * Query capability graph
 */
async function runGraphQuery(config, queryParams) {
  console.log('🔎 Querying Capability Graph');

  const graphFile = path.join(config.outputPath, 'capability_graph.json');
  if (!fs.existsSync(graphFile)) {
    throw new Error('capability_graph.json not found. Run graph building first.');
  }

  const graphData = JSON.parse(fs.readFileSync(graphFile, 'utf8'));

  const result = await runTypeScriptModule('capability-graph-query', config, {
    graph: graphData,
    query: queryParams
  });

  console.log(`✅ Query complete`);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Run complete pipeline
 */
async function runFullPipeline(config) {
  console.log('🚀 Running Complete Archaeology Pipeline');
  console.log('═══════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Phase 1: Extract
    await runExtraction(config);
    console.log('');

    // Phase 2: Infer
    await runInference(config);
    console.log('');

    // Phase 3: Detect
    await runDetection(config);
    console.log('');

    // Phase 4: Reconstruct
    await runReconstruction(config);
    console.log('');

    // Phase 5: Graph
    await runGraphBuild(config);
    console.log('');

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('═══════════════════════════════════════════');
    console.log(`✅ Pipeline Complete in ${duration}s`);
    console.log('');
    console.log('📁 Output files:');
    console.log(`   ${path.join(config.outputPath, 'fragments.json')}`);
    console.log(`   ${path.join(config.outputPath, 'subsystems.json')}`);
    console.log(`   ${path.join(config.outputPath, 'deletion_candidates.json')}`);
    console.log(`   ${path.join(config.outputPath, 'reconstruction_bundles.json')}`);
    console.log(`   ${path.join(config.outputPath, 'capability_graph.json')}`);
    console.log(`   ${path.join(config.outputPath, 'capability_graph.dot')}`);
    console.log(`   ${path.join(config.outputPath, 'patches/')}*.patch`);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Review deletion candidates');
    console.log('   2. Apply resurrection patches: git apply artifacts/archaeology/patches/<bundle>.patch');
    console.log('   3. Visualize graph: dot -Tpng artifacts/archaeology/capability_graph.dot -o graph.png');

  } catch (error) {
    console.error(`\n❌ Pipeline failed: ${error.message}`);
    process.exit(1);
  }
}

// ============================================================================
// TypeScript Module Runner (Simplified)
// ============================================================================

async function runTypeScriptModule(moduleName, config, params) {
  // In a real implementation, this would dynamically import and run the TS modules
  // For now, create a placeholder that simulates the module execution

  console.log(`   [${moduleName}] Starting...`);

  // Simulate module execution
  await new Promise(resolve => setTimeout(resolve, 100));

  // Write placeholder output files
  const outputFile = getOutputFile(moduleName, config.outputPath);
  if (outputFile) {
    const data = generatePlaceholderData(moduleName, params);
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  }

  console.log(`   [${moduleName}] Complete`);

  return { success: true };
}

function getOutputFile(moduleName, outputPath) {
  const mapping = {
    'fragment-extractor': 'fragments.json',
    'subsystem-inference': 'subsystems.json',
    'partial-deletion-detector': 'deletion_candidates.json',
    'reconstruction-engine': 'reconstruction_bundles.json',
    'capability-graph': 'capability_graph.json'
  };

  const filename = mapping[moduleName];
  return filename ? path.join(outputPath, filename) : null;
}

function generatePlaceholderData(moduleName, params) {
  switch (moduleName) {
    case 'fragment-extractor':
      return {
        fragments: [],
        metadata: {
          total_fragments: 0,
          total_deletions: 0,
          extraction_timestamp: new Date().toISOString()
        }
      };
    case 'subsystem-inference':
      return {
        subsystems: [],
        metadata: {
          total_subsystems: 0,
          total_fragments_analyzed: 0,
          avg_subsystem_size: 0,
          inference_timestamp: new Date().toISOString()
        }
      };
    case 'partial-deletion-detector':
      return {
        candidates: [],
        metadata: {
          total_candidates: 0,
          high_priority_count: 0,
          immediate_resurrection_count: 0,
          detection_timestamp: new Date().toISOString()
        }
      };
    case 'reconstruction-engine':
      return {
        bundles: [],
        metadata: {
          successful_reconstructions: 0,
          failed_reconstructions: 0,
          avg_confidence: 0,
          reconstruction_timestamp: new Date().toISOString()
        }
      };
    case 'capability-graph':
      return {
        nodes: [],
        edges: [],
        metadata: {
          created_at: new Date().toISOString(),
          total_fragments: 0,
          total_subsystems: 0,
          total_deletions: 0,
          total_reconstructions: 0
        }
      };
    default:
      return {};
  }
}

// ============================================================================
// Help
// ============================================================================

function showHelp() {
  console.log(`
Repository Archaeology CLI - Capability Resurrection Engine

USAGE:
  archaeology-cli <command> [options]

COMMANDS:
  extract         Extract fragments from git history
  infer           Infer subsystem boundaries
  detect          Detect deleted capabilities
  reconstruct     Generate resurrection patches
  graph           Build capability provenance graph
  query           Query the capability graph
  full            Run complete pipeline (recommended)
  help            Show this help message

OPTIONS:
  --repo, -r <path>       Repository path (default: current directory)
  --output, -o <path>     Output directory (default: artifacts/archaeology)
  --since <commit>        Start commit (default: HEAD~100)
  --until <commit>        End commit (default: HEAD)
  --max-fragments <n>     Maximum fragments to extract (default: 10000)
  --max-bundles <n>       Maximum reconstruction bundles (default: 50)
  --no-deletions          Skip deletion tracking
  --no-validation         Skip syntax validation

QUERY OPTIONS:
  --query-type <type>     Query type: dependencies, dependents, provenance, evolution, path
  --node-id <id>          Node ID to query
  --max-depth <n>         Maximum traversal depth (default: 3)

EXAMPLES:
  # Run complete pipeline on current repository
  archaeology-cli full

  # Extract fragments from last 200 commits
  archaeology-cli extract --since HEAD~200

  # Query dependencies of a node
  archaeology-cli query --query-type dependencies --node-id fragment_abc123

  # Run pipeline with custom output directory
  archaeology-cli full --repo /path/to/repo --output /path/to/output

For more information, see: docs/archaeology/README.md
`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const { command, config, queryParams } = parseArgs();

  try {
    switch (command) {
      case 'extract':
        await runExtraction(config);
        break;
      case 'infer':
        await runInference(config);
        break;
      case 'detect':
        await runDetection(config);
        break;
      case 'reconstruct':
        await runReconstruction(config);
        break;
      case 'graph':
        await runGraphBuild(config);
        break;
      case 'query':
        await runGraphQuery(config, queryParams);
        break;
      case 'full':
        await runFullPipeline(config);
        break;
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "archaeology-cli help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
