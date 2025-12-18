#!/usr/bin/env node
import { Command } from 'commander';
import pino from 'pino';
import { EventStore } from '../eventStore.js';
import { ReplayService } from '../replay.js';
import type { ReplayRequest } from '../types.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

const program = new Command();

program
  .name('replay')
  .description('Event replay CLI for streaming-ingest service')
  .version('1.0.0');

program
  .command('from-checkpoint')
  .description('Replay events from a checkpoint')
  .requiredOption('--checkpoint-id <id>', 'Checkpoint ID to replay from')
  .requiredOption('--topic <topic>', 'Source topic')
  .option('--target-topic <topic>', 'Target topic (defaults to source topic)')
  .option('--event-types <types>', 'Comma-separated list of event types to filter', (val) => val.split(','))
  .option('--sources <sources>', 'Comma-separated list of sources to filter', (val) => val.split(','))
  .option('--tenant-ids <ids>', 'Comma-separated list of tenant IDs to filter', (val) => val.split(','))
  .action(async (options) => {
    const config = getConfig();
    const eventStore = new EventStore(config.postgresUrl, logger);
    const replayService = new ReplayService(config.kafkaBrokers, eventStore, logger);

    try {
      await replayService.initialize();

      const request: ReplayRequest = {
        checkpointId: options.checkpointId,
        topic: options.topic,
        targetTopic: options.targetTopic,
        filters: {
          eventTypes: options.eventTypes,
          sources: options.sources,
          tenantIds: options.tenantIds,
        },
      };

      logger.info({ request }, 'Starting replay from checkpoint');

      const result = await replayService.replay(request);

      logger.info({ result }, 'Replay completed successfully');
      console.log('\n✅ Replay completed!');
      console.log(`   Events replayed: ${result.eventsReplayed}`);
      console.log(`   New checkpoint: ${result.checkpointCreated}`);
    } catch (error: any) {
      logger.error({ error }, 'Replay failed');
      console.error('\n❌ Replay failed:', error.message);
      process.exit(1);
    } finally {
      await replayService.close();
      await eventStore.close();
    }
  });

program
  .command('from-offset')
  .description('Replay events from an offset range')
  .requiredOption('--from-offset <offset>', 'Starting offset')
  .requiredOption('--topic <topic>', 'Source topic')
  .option('--to-offset <offset>', 'Ending offset (inclusive)')
  .option('--target-topic <topic>', 'Target topic (defaults to source topic)')
  .option('--event-types <types>', 'Comma-separated list of event types to filter', (val) => val.split(','))
  .option('--sources <sources>', 'Comma-separated list of sources to filter', (val) => val.split(','))
  .option('--tenant-ids <ids>', 'Comma-separated list of tenant IDs to filter', (val) => val.split(','))
  .action(async (options) => {
    const config = getConfig();
    const eventStore = new EventStore(config.postgresUrl, logger);
    const replayService = new ReplayService(config.kafkaBrokers, eventStore, logger);

    try {
      await replayService.initialize();

      const request: ReplayRequest = {
        fromOffset: options.fromOffset,
        toOffset: options.toOffset,
        topic: options.topic,
        targetTopic: options.targetTopic,
        filters: {
          eventTypes: options.eventTypes,
          sources: options.sources,
          tenantIds: options.tenantIds,
        },
      };

      logger.info({ request }, 'Starting replay from offset');

      const result = await replayService.replay(request);

      logger.info({ result }, 'Replay completed successfully');
      console.log('\n✅ Replay completed!');
      console.log(`   Events replayed: ${result.eventsReplayed}`);
      console.log(`   New checkpoint: ${result.checkpointCreated}`);
    } catch (error: any) {
      logger.error({ error }, 'Replay failed');
      console.error('\n❌ Replay failed:', error.message);
      process.exit(1);
    } finally {
      await replayService.close();
      await eventStore.close();
    }
  });

program
  .command('create-checkpoint')
  .description('Create a checkpoint at a specific offset')
  .requiredOption('--topic <topic>', 'Topic name')
  .requiredOption('--partition <partition>', 'Partition number', parseInt)
  .requiredOption('--offset <offset>', 'Offset')
  .action(async (options) => {
    const config = getConfig();
    const eventStore = new EventStore(config.postgresUrl, logger);
    const replayService = new ReplayService(config.kafkaBrokers, eventStore, logger);

    try {
      await replayService.initialize();

      logger.info({ options }, 'Creating checkpoint');

      const checkpointId = await replayService.createCheckpoint(
        options.topic,
        options.partition,
        options.offset
      );

      logger.info({ checkpointId }, 'Checkpoint created successfully');
      console.log('\n✅ Checkpoint created!');
      console.log(`   Checkpoint ID: ${checkpointId}`);
    } catch (error: any) {
      logger.error({ error }, 'Checkpoint creation failed');
      console.error('\n❌ Checkpoint creation failed:', error.message);
      process.exit(1);
    } finally {
      await replayService.close();
      await eventStore.close();
    }
  });

program
  .command('get-checkpoint')
  .description('Get checkpoint details')
  .requiredOption('--checkpoint-id <id>', 'Checkpoint ID')
  .action(async (options) => {
    const config = getConfig();
    const eventStore = new EventStore(config.postgresUrl, logger);

    try {
      const checkpoint = await eventStore.getCheckpoint(options.checkpointId);

      if (!checkpoint) {
        console.error(`\n❌ Checkpoint ${options.checkpointId} not found`);
        process.exit(1);
      }

      console.log('\n📍 Checkpoint Details:');
      console.log(`   ID: ${checkpoint.id}`);
      console.log(`   Topic: ${checkpoint.topic}`);
      console.log(`   Partition: ${checkpoint.partition}`);
      console.log(`   Offset: ${checkpoint.offset}`);
      console.log(`   Timestamp: ${new Date(checkpoint.timestamp).toISOString()}`);
      console.log(`   Event Count: ${checkpoint.eventCount}`);
      console.log(`   Hash: ${checkpoint.hash}`);
    } catch (error: any) {
      logger.error({ error }, 'Failed to get checkpoint');
      console.error('\n❌ Failed to get checkpoint:', error.message);
      process.exit(1);
    } finally {
      await eventStore.close();
    }
  });

function getConfig() {
  return {
    kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    postgresUrl: process.env.DATABASE_URL || 'postgresql://summit:password@localhost:5432/summit_dev',
  };
}

program.parse();
