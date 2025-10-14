#!/usr/bin/env node
const { run } = require('../src/cli');

run(process.argv).catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
