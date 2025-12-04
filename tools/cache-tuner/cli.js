#!/usr/bin/env node
import path from 'path';
import { collectFacts, buildOptimizationPlan, applyPlan, formatBytes } from './cache-analyzer.js';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes('--apply'),
    json: args.includes('--json'),
  };
}

function summarizeFacts(facts) {
  return facts.map((fact) => {
    if (fact.kind === 'pnpm') {
      return {
        cache: 'pnpm',
        path: fact.path,
        exists: fact.stats.exists,
        size: formatBytes(fact.stats.sizeBytes),
        stale: fact.isStale,
        ephemeral: fact.isEphemeral,
      };
    }

    if (fact.kind === 'turbo') {
      return {
        cache: 'turbo',
        path: fact.path,
        exists: fact.stats.exists,
        size: formatBytes(fact.stats.sizeBytes),
        disabledTasks: fact.cacheDisabledTasks,
      };
    }

    if (fact.kind === 'nx') {
      return {
        cache: 'nx',
        path: fact.path,
        exists: fact.stats.exists,
        size: formatBytes(fact.stats.sizeBytes),
        configured: fact.nxConfigPresent,
      };
    }

    if (fact.kind === 'typescript') {
      return {
        cache: 'typescript',
        files: fact.files.length,
        newest: fact.files.length
          ? fact.files.reduce((latest, current) => (current.mtime > latest ? current.mtime : latest), fact.files[0].mtime)
          : null,
        recommendedDir: fact.recommendedDir,
      };
    }

    return { cache: fact.kind };
  });
}

function printPlan(plan) {
  if (plan.findings.length) {
    console.log('Findings:');
    for (const finding of plan.findings) {
      console.log(` - ${finding}`);
    }
    console.log('');
  }

  if (plan.optimizations.length) {
    console.log('Optimizations:');
    for (const optimization of plan.optimizations) {
      if (optimization.type === 'env') {
        console.log(` - Set ${optimization.env}=${optimization.value} (${optimization.description})`);
      } else if (optimization.type === 'command') {
        console.log(` - Run ${optimization.command.join(' ')} (${optimization.description})`);
      } else if (optimization.type === 'cleanup-list') {
        console.log(` - Remove ${optimization.paths.length} stale cache file(s) (${optimization.description})`);
      } else if (optimization.type === 'mkdir') {
        console.log(` - Create ${optimization.path} (${optimization.description})`);
      }
    }
    console.log('');
  } else {
    console.log('No cache optimizations required.');
  }

  if (plan.envExports.length) {
    console.log('Environment exports written to .cache/cache-tuner.env');
  }
}

async function main() {
  const args = parseArgs();
  const workspaceRoot = path.resolve(process.cwd());
  const facts = collectFacts(workspaceRoot);
  const plan = buildOptimizationPlan(facts);

  if (args.json) {
    console.log(JSON.stringify({ facts: summarizeFacts(facts), plan }, null, 2));
  } else {
    printPlan(plan);
  }

  if (args.apply) {
    const result = applyPlan(plan, { workspaceRoot });
    if (result.executedCommands.length) {
      console.log('Executed commands:');
      for (const executed of result.executedCommands) {
        const status = executed.ok ? 'ok' : `failed (status ${executed.status})`;
        console.log(` - ${executed.optimization}: ${status}`);
        if (executed.stderr) {
          console.log(`   stderr: ${executed.stderr}`);
        }
      }
    }

    if (result.envFilePath) {
      console.log(`Cached environment exports at ${result.envFilePath}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
