"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducerWrapper = void 0;
// @ts-nocheck
const kafkajs_1 = require("kafkajs");
const Logger_js_1 = require("./Logger.js");
class KafkaProducerWrapper {
    producer;
    logger = new Logger_js_1.Logger('KafkaProducer');
    schemaRegistry;
    isConnected = false;
    constructor(config) {
        const kafka = new kafkajs_1.Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            logLevel: 0, // ERROR only
        });
        this.producer = kafka.producer();
        this.schemaRegistry = config.schemaRegistry;
    }
    async connect() {
        if (!this.isConnected) {
            try {
                await this.producer.connect();
                this.isConnected = true;
                this.logger.info('Connected to Kafka Producer');
            }
            catch (error) {
                this.logger.error('Failed to connect to Kafka Producer', error);
                throw error;
            }
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.producer.disconnect();
            this.isConnected = false;
            this.logger.info('Disconnected from Kafka Producer');
        }
    }
    async send(topic, messages) {
        await this.connect();
        const kafkaMessages = await Promise.all(messages.map(async (msg) => {
            let value;
            if (this.schemaRegistry) {
                // Dynamic schema lookup based on topic name (subject)
                // We assume subject naming strategy is TopicNameStrategy
                const subject = topic;
                // We pass 'msg' as schema to check compatibility or registration
                // In a real system we might cache this ID.
                const schemaId = await this.schemaRegistry.getId(subject, msg);
                value = await this.schemaRegistry.encode(schemaId, msg);
            }
            else {
                value = JSON.stringify(msg);
            }
            return {
                value,
            };
        }));
        try {
            await this.producer.send({
                topic,
                messages: kafkaMessages,
            });
        }
        catch (error) {
            this.logger.error(`Failed to send messages to topic ${topic}`, error);
            throw error;
        }
    }
}
exports.KafkaProducerWrapper = KafkaProducerWrapper;
