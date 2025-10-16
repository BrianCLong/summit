#!/usr/bin/env node
/**
 * Estimate unit costs using Prometheus export files or API (optional).
 * - cost per 1k ingested events
 * - cost per 1M GraphQL calls
 * Provide: --events=N --events-cost=USD --graphql=N --graphql-cost=USD
 */
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
const argv = yargs(hideBin(process.argv))
  .option('events', { type: 'number', describe: 'Events processed in period' })
  .option('events-cost', {
    type: 'number',
    describe: 'Infra cost attributed to ingest',
  })
  .option('graphql', { type: 'number', describe: 'GraphQL requests in period' })
  .option('graphql-cost', {
    type: 'number',
    describe: 'Infra cost attributed to API',
  })
  .demandOption(['events', 'events-cost', 'graphql', 'graphql-cost']).argv;

const per1k = (argv.events_cost / (argv.events / 1000)).toFixed(4);
const per1M = (argv.graphql_cost / (argv.graphql / 1_000_000)).toFixed(4);
console.log(
  JSON.stringify(
    { unit_cost_events_per_1k: +per1k, unit_cost_graphql_per_1M: +per1M },
    null,
    2,
  ),
);
