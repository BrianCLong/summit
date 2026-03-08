"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = publish;
exports.claim = claim;
exports.ack = ack;
const redis_1 = require("redis");
const r = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
async function publish(t) {
    await r.xAdd('tgo:tasks', '*', { id: t.id, payload: JSON.stringify(t) });
}
async function claim(workerId, caps) {
    while (true) {
        const m = await r.xReadGroup('tgo', 'g1', [{ key: 'tgo:tasks', id: '>' }], {
            COUNT: 1,
            BLOCK: 5000,
        });
        if (!m)
            continue;
        const t = JSON.parse(m[0].messages[0].message.payload);
        if (caps.every((c) => t.caps.includes(c)))
            return t;
        await r.xAck('tgo:tasks', 'g1', m[0].messages[0].id); // skip if incompatible
    }
}
async function ack(id) {
    await r.xAck('tgo:tasks', 'g1', id);
}
