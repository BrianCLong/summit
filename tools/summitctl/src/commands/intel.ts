import { Command } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const intelCommand = new Command('intel')
  .description('Manage the Summit Engineering Intelligence Platform');

intelCommand
  .command('status')
  .description('Check the status of the intelligence platform')
  .action(() => {
    console.log('--- Summit Engineering Intelligence Status ---');
    const services = ['intelligence-api', 'intelligence-console'];
    services.forEach(s => {
      try {
        const status = execSync(`docker ps --filter name=summit-${s} --format "{{.Status}}"`).toString().trim();
        console.log(`${s}: ${status || 'OFFLINE'}`);
      } catch (e) {
        console.log(`${s}: ERROR`);
      }
    });
  });

intelCommand
  .command('report')
  .description('Generate the latest architectural intelligence artifacts')
  .action(() => {
    console.log('Generating architectural intelligence artifacts...');
    try {
      execSync('node scripts/generate-all-intelligence.mjs', { stdio: 'inherit' });
      console.log('Successfully generated artifacts in engineering-intelligence/');
    } catch (e: any) {
      console.error('Failed to generate artifacts:', e.message);
    }
  });

intelCommand
  .command('up')
  .description('Start the intelligence platform services')
  .action(() => {
    console.log('Starting Engineering Intelligence services...');
    execSync('make intel-up', { stdio: 'inherit' });
  });
