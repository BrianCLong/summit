import { Command } from 'commander';
import { Kafka } from 'kafkajs';
import pino from 'pino';
import type { DlqEvent } from '../runtime/types';

const logger = pino({ name: 'adapter-sdk-cli' });

export interface ReplayOptions {
  brokers: string[];
  dlqTopic: string;
  targetTopic?: string;
  fromBeginning?: boolean;
  limit?: number;
  clientId?: string;
}

export async function replayDlq(options: ReplayOptions): Promise<number> {
  const kafka = new Kafka({
    clientId: options.clientId ?? 'adapter-sdk-replay',
    brokers: options.brokers,
  });

  const consumer = kafka.consumer({
    groupId: `${options.clientId ?? 'adapter-sdk'}-replay-${Date.now()}`,
  });
  const producer = kafka.producer({ allowAutoTopicCreation: false });

  await Promise.all([consumer.connect(), producer.connect()]);
  await consumer.subscribe({ topic: options.dlqTopic, fromBeginning: options.fromBeginning ?? false });

  let replayed = 0;

  const running = consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) {
        return;
      }

      try {
        const event = JSON.parse(message.value.toString()) as DlqEvent;
        const destination =
          options.targetTopic ??
          (event.metadata?.targetTopic as string | undefined) ??
          (event.metadata?.originalTopic as string | undefined) ??
          event.operation;

        await producer.send({
          topic: destination,
          messages: [
            {
              key: event.idempotencyKey ?? event.adapterId,
              value: JSON.stringify(event.payload ?? event),
              headers: {
                'adapter-id': event.adapterId,
                'adapter-operation': event.operation,
                'dlq-replay': 'true',
              },
            },
          ],
        });

        replayed += 1;
        logger.info(
          {
            adapterId: event.adapterId,
            operation: event.operation,
            destination,
          },
          'Replayed DLQ message',
        );

        if (options.limit && replayed >= options.limit) {
          await consumer.stop();
        }
      } catch (error) {
        logger.error({ error }, 'Failed to replay DLQ message');
      }
    },
  });

  await running;
  await Promise.all([consumer.disconnect(), producer.disconnect()]);
  return replayed;
}

export function buildCli(argv = process.argv): void {
  const program = new Command();

  program
    .name('adapter-sdk')
    .description('Adapter SDK utilities')
    .version('1.0.0');

  program
    .command('replay')
    .requiredOption('-b, --brokers <brokers...>', 'Kafka/Redpanda broker list')
    .requiredOption('-d, --dlq-topic <topic>', 'DLQ topic to consume from')
    .option('-t, --target-topic <topic>', 'Target topic for replayed messages')
    .option('--from-beginning', 'Start from earliest offset', false)
    .option('--limit <number>', 'Maximum messages to replay', (value) => Number.parseInt(value, 10))
    .option('--client-id <id>', 'Kafka client id for the replay utility')
    .action(async (cmdOpts) => {
      try {
        const replayed = await replayDlq({
          brokers: cmdOpts.brokers,
          dlqTopic: cmdOpts.dlqTopic,
          targetTopic: cmdOpts.targetTopic,
          fromBeginning: cmdOpts.fromBeginning,
          limit: cmdOpts.limit,
          clientId: cmdOpts.clientId,
        });

        logger.info({ replayed }, 'Finished DLQ replay');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'DLQ replay failed');
        process.exit(1);
      }
    });

  void program.parseAsync(argv);
}
