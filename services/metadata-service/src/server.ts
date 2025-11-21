/**
 * Metadata Service
 * Background service for automated metadata discovery
 */

import cron from 'node-cron';
import { DiscoveryScheduler } from './schedulers/DiscoveryScheduler.js';

console.log('Starting Metadata Service...');

// Initialize scheduler
const scheduler = new DiscoveryScheduler();

// Schedule daily discovery jobs at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled discovery jobs...');
  await scheduler.runScheduledJobs();
});

// Schedule hourly incremental updates
cron.schedule('0 * * * *', async () => {
  console.log('Running incremental metadata updates...');
  await scheduler.runIncrementalUpdates();
});

console.log('Metadata Service started successfully');
console.log('Scheduled jobs:');
console.log('  - Daily full discovery: 2:00 AM');
console.log('  - Hourly incremental updates: Every hour');

// Keep process running
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
