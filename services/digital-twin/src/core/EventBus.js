"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const kafkajs_1 = require("kafkajs");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'EventBus' });
class EventBus {
    kafka;
    producer;
    consumer;
    eventSubject = new rxjs_1.Subject();
    topic = 'digital-twin-events';
    connected = false;
    constructor(kafkaBrokers, clientId) {
        this.kafka = new kafkajs_1.Kafka({
            clientId,
            brokers: kafkaBrokers,
        });
        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({ groupId: `${clientId}-group` });
    }
    async connect() {
        if (this.connected) {
            return;
        }
        await this.producer.connect();
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
        await this.consumer.run({
            eachMessage: async ({ message }) => {
                if (message.value) {
                    const event = JSON.parse(message.value.toString());
                    this.eventSubject.next(event);
                }
            },
        });
        this.connected = true;
        logger.info('EventBus connected to Kafka');
    }
    async disconnect() {
        await this.producer.disconnect();
        await this.consumer.disconnect();
        this.connected = false;
    }
    async publish(event) {
        await this.producer.send({
            topic: this.topic,
            messages: [
                {
                    key: event.twinId,
                    value: JSON.stringify(event),
                    headers: {
                        eventType: event.type,
                        timestamp: event.timestamp.toISOString(),
                    },
                },
            ],
        });
        logger.debug({ eventId: event.id, twinId: event.twinId }, 'Event published');
    }
    subscribe(twinId) {
        if (twinId) {
            return this.eventSubject.pipe((0, operators_1.filter)((e) => e.twinId === twinId));
        }
        return this.eventSubject.asObservable();
    }
    subscribeByType(eventType) {
        return this.eventSubject.pipe((0, operators_1.filter)((e) => e.type === eventType));
    }
}
exports.EventBus = EventBus;
