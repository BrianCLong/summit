"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumerWrapper = void 0;
// @ts-nocheck
const kafkajs_1 = require("kafkajs");
const Logger_js_1 = require("./Logger.js");
class KafkaConsumerWrapper {
    consumer;
    logger = new Logger_js_1.Logger('KafkaConsumer');
    schemaRegistry;
    dlqProducer;
    dlqTopic;
    isConnected = false;
    config;
    constructor(config) {
        const kafka = new kafkajs_1.Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            logLevel: 0,
        });
        this.consumer = kafka.consumer({ groupId: config.groupId });
        this.schemaRegistry = config.schemaRegistry;
        this.dlqProducer = config.dlqProducer;
        this.dlqTopic = config.dlqTopic;
        this.config = config;
    }
    async connect() {
        if (!this.isConnected) {
            try {
                await this.consumer.connect();
                this.isConnected = true;
                this.logger.info('Connected to Kafka Consumer');
            }
            catch (error) {
                this.logger.error('Failed to connect to Kafka Consumer', error);
                throw error;
            }
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.consumer.disconnect();
            this.isConnected = false;
            this.logger.info('Disconnected from Kafka Consumer');
        }
    }
    async subscribe(topic, fromBeginning = false) {
        await this.connect();
        await this.consumer.subscribe({ topic, fromBeginning });
        this.logger.info(`Subscribed to topic ${topic}`);
    }
    async run(handler) {
        await this.connect();
        await this.consumer.run({
            partitionsConsumedConcurrently: this.config.partitionsConsumedConcurrently || 1,
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    let payload;
                    if (message.value) {
                        if (this.schemaRegistry) {
                            payload = await this.schemaRegistry.decode(message.value);
                        }
                        else {
                            payload = JSON.parse(message.value.toString());
                        }
                    }
                    await handler(payload);
                }
                catch (error) {
                    this.logger.error(`Error processing message from topic ${topic}`, error);
                    if (this.dlqProducer && this.dlqTopic && message.value) {
                        try {
                            // Wrap original message with error metadata
                            const dlqPayload = {
                                originalTopic: topic,
                                originalPartition: partition,
                                originalValue: message.value.toString('base64'),
                                error: error instanceof Error ? error.message : String(error),
                                timestamp: new Date().toISOString()
                            };
                            await this.dlqProducer.send(this.dlqTopic, [dlqPayload]);
                            this.logger.info(`Sent failed message to DLQ ${this.dlqTopic}`);
                            return;
                        }
                        catch (dlqError) {
                            this.logger.error('Failed to send to DLQ', dlqError);
                            throw dlqError;
                        }
                    }
                    throw error;
                }
            },
        });
    }
}
exports.KafkaConsumerWrapper = KafkaConsumerWrapper;
