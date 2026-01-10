#!/usr/bin/env node
import fs from 'fs';
import process from 'process';
import { validateTrajectory } from './validate.js';

const [, , target] = process.argv;
if (!target) {
  // eslint-disable-next-line no-console
  console.error('Usage: pnpm agentic:validate <trajectory.json>');
  process.exit(1);
}

const content = fs.readFileSync(target, 'utf-8');
const trajectory = JSON.parse(content);
const result = validateTrajectory(trajectory);
if (result.valid) {
  // eslint-disable-next-line no-console
  console.log('Trajectory is valid');
  process.exit(0);
}

// eslint-disable-next-line no-console
console.error('Trajectory invalid:', result.errors.join('; '));
process.exit(1);
