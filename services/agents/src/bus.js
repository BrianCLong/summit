"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emit = emit;
exports.consume = consume;
const uuid_1 = require("uuid");
const redis_1 = require("redis");
const r = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
r.connect();
async function emit(kind, payload) {
    const m = { id: (0, uuid_1.v4)(), kind, key: payload.key || (0, uuid_1.v4)(), payload };
    await r.xAdd('agents', '*', { kind: m.kind, msg: JSON.stringify(m) });
}
async function consume(group, handler) {
    await r
        .xGroupCreate('agents', group, '0-0', { MKSTREAM: true })
        .catch(() => { });
    while (true) {
        const res = await r.xReadGroup(group, group + '-c', [{ key: 'agents', id: '>' }], { COUNT: 1, BLOCK: 5000 });
        if (!res)
            continue;
        const m = JSON.parse(res[0].messages[0].message.msg);
        await handler(m);
        await r.xAck('agents', group, res[0].messages[0].id);
    }
}
