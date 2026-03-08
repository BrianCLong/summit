"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("../src/conductor/events/engine.js");
test('startKafkaSource throws without kafkajs', async () => {
    await expect((0, engine_js_1.startKafkaSource)({ id: 1, topic: 't', group: 'g', runbook: 'rb' })).rejects.toBeTruthy();
});
