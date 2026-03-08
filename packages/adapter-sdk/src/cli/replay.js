"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayDlq = replayDlq;
exports.buildCli = buildCli;
const commander_1 = require("commander");
const kafkajs_1 = require("kafkajs");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'adapter-sdk-cli' });
async function replayDlq(options) {
    const kafka = new kafkajs_1.Kafka({
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
                const event = JSON.parse(message.value.toString());
                const destination = options.targetTopic ??
                    event.metadata?.targetTopic ??
                    event.metadata?.originalTopic ??
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
                logger.info({
                    adapterId: event.adapterId,
                    operation: event.operation,
                    destination,
                }, 'Replayed DLQ message');
                if (options.limit && replayed >= options.limit) {
                    await consumer.stop();
                }
            }
            catch (error) {
                logger.error({ error }, 'Failed to replay DLQ message');
            }
        },
    });
    await running;
    await Promise.all([consumer.disconnect(), producer.disconnect()]);
    return replayed;
}
function buildCli(argv = process.argv) {
    const program = new commander_1.Command();
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
        }
        catch (error) {
            logger.error({ error }, 'DLQ replay failed');
            process.exit(1);
        }
    });
    void program.parseAsync(argv);
}
