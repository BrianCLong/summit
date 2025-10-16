#!/usr/bin/env node

const path = require('path');
const { buildSite } = require('./src/build');
const { linkCheck } = require('./src/linkcheck');

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.shift();
  const options = {};
  while (args.length > 0) {
    const token = args.shift();
    if (!token) {
      break;
    }
    if (!token.startsWith('--')) {
      continue;
    }
    const eqIndex = token.indexOf('=');
    if (eqIndex !== -1) {
      const key = token.slice(2, eqIndex);
      const value = token.slice(eqIndex + 1);
      options[key] = value;
      continue;
    }
    const key = token.slice(2);
    if (args[0] && !args[0].startsWith('--')) {
      options[key] = args.shift();
    } else {
      options[key] = true;
    }
  }
  return { command, options };
}

async function run() {
  const { command, options } = parseArgs(process.argv);
  if (!command || (command !== 'build' && command !== 'linkcheck')) {
    console.error(
      'Usage: docforge <build|linkcheck> [--out <dir>] [--root <dir>] [--version <value>]',
    );
    process.exitCode = 1;
    return;
  }

  const rootDir = options.root
    ? path.resolve(process.cwd(), options.root)
    : process.cwd();

  try {
    if (command === 'build') {
      const outDir = options.out ? options.out : 'docs/site';
      await buildSite({
        rootDir,
        outDir: path.resolve(process.cwd(), outDir),
        version: options.version,
      });
    } else if (command === 'linkcheck') {
      const targetDir = options.root ? options.root : 'docs/site';
      const result = await linkCheck({
        rootDir: path.resolve(process.cwd(), targetDir),
      });
      if (result.broken.length > 0) {
        console.error('Broken internal links detected:');
        for (const link of result.broken) {
          console.error(`- ${link.source} -> ${link.target}`);
        }
        process.exitCode = 1;
      } else {
        console.log('All internal links are valid.');
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

run();
