#!/usr/bin/env node

const { spawn } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const path = require('path');

/**
 * CLI entry point for Maestro Agent Pipeline
 * Usage: node scripts/run-agents.js <mode> [options]
 */

function main() {
  const mode = process.argv[2] || 'ci';
  const options = parseArgs(process.argv.slice(3));

  if (!['ci', 'pr', 'dev'].includes(mode)) {
    console.error('❌ Invalid mode. Use: ci, pr, or dev');
    process.exit(1);
  }

  console.log(`🎭 Starting Maestro Agent Pipeline in ${mode} mode...`);
  console.log(`Options: ${JSON.stringify(options)}`);

  // Check if we're in a valid project
  if (!existsSync('package.json')) {
    console.error('❌ No package.json found. Run from project root.');
    process.exit(1);
  }

  // Check if TypeScript source exists
  const agentIndexPath = path.join('src', 'agents', 'index.ts');
  if (!existsSync(agentIndexPath)) {
    console.error(
      '❌ Agent source files not found. Please ensure src/agents/ exists.',
    );
    process.exit(1);
  }

  // Compile and run TypeScript
  runAgentPipeline(mode, options);
}

function parseArgs(args) {
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];

    if (key && value) {
      options[key] = value;
    }
  }

  return options;
}

function runAgentPipeline(mode, options) {
  // Create a temporary runner script
  const runnerScript = `
const { runAgentPipeline } = require('./src/agents/index.ts');

async function run() {
  try {
    await runAgentPipeline('${mode}');
  } catch (error) {
    console.error('Pipeline failed:', error);
    process.exit(1);
  }
}

run();
`;

  // Use ts-node to run TypeScript directly
  const child = spawn('npx', ['ts-node', '-e', runnerScript], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: options.env || process.env.NODE_ENV || 'development',
      MAESTRO_AGENT_MODE: mode,
    },
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ Agent pipeline completed successfully (${mode} mode)`);
    } else {
      console.error(`❌ Agent pipeline failed with code ${code}`);
    }
    process.exit(code);
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start agent pipeline:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down agent pipeline...');
    child.kill('SIGINT');
  });
}

// Alternative direct execution for CI/CD
function runDirect(mode) {
  console.log(`🔄 Running agent pipeline directly in ${mode} mode...`);

  // This would be used when the agents are pre-compiled
  try {
    const { runAgentPipeline } = require('./dist/agents/index.js');
    return runAgentPipeline(mode);
  } catch (error) {
    console.error(
      '❌ Failed to run compiled agents. Falling back to ts-node...',
    );
    return runAgentPipeline(mode, {});
  }
}

// Export for programmatic usage
module.exports = { main, runDirect };

if (require.main === module) {
  main();
}
