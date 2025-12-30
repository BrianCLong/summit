#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function resolveEntry() {
  const distPath = path.join(__dirname, '..', 'dist', 'cli.js');
  if (fs.existsSync(distPath)) {
    return distPath;
  }

  try {
    // eslint-disable-next-line global-require
    require('ts-node/register');
  } catch (err) {
    console.error('ts-node is required to run the Agent Lab CLI from source.');
    console.error(err);
    process.exit(1);
  }
  return path.join(__dirname, '..', 'src', 'cli.ts');
}

require(resolveEntry());
