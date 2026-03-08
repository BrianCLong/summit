"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
const kafkajs_1 = require("kafkajs");
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(_ctx, { payload }) {
        const kafka = new kafkajs_1.Kafka({ clientId: 'maestro', brokers: payload.brokers });
        const producer = kafka.producer();
        await producer.connect();
        await producer.send({ topic: payload.topic, messages: payload.messages });
        await producer.disconnect();
        return { payload: { count: payload.messages.length } };
    },
});
