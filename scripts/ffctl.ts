#!/usr/bin/env ts-node
import fs from 'fs';
const flags = JSON.parse(
  JSON.stringify(require('../feature-flags/flags.yaml')),
);
const [name, value] = process.argv.slice(2);
if (!flags.features[name]) throw new Error('Unknown flag');
flags.features[name].default = value === 'true';
fs.writeFileSync('feature-flags/flags.yaml', flags);
console.log(`Set ${name}=${value}`);
