"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamProcessor = void 0;
const Logger_js_1 = require("../Logger.js");
class StreamProcessor {
    consumer;
    producer;
    logger;
    sourceTopic;
    destTopic;
    constructor(consumer, producer, sourceTopic, destTopic, name) {
        this.consumer = consumer;
        this.producer = producer;
        this.sourceTopic = sourceTopic;
        this.destTopic = destTopic;
        this.logger = new Logger_js_1.Logger(`StreamProcessor-${name}`);
    }
    async start() {
        this.logger.info(`Starting processor from ${this.sourceTopic} to ${this.destTopic}`);
        await this.consumer.run(async (message) => {
            try {
                const result = await this.process(message);
                if (result) {
                    await this.producer.send(this.destTopic, [result]);
                }
            }
            catch (error) {
                this.logger.error('Error processing message', error);
                throw error;
            }
        });
    }
    async stop() {
        await this.consumer.disconnect();
        await this.producer.disconnect();
        this.logger.info('Stopped processor');
    }
}
exports.StreamProcessor = StreamProcessor;
