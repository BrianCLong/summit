"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
const nats_1 = require("nats");
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(_ctx, { payload }) {
        const nc = await (0, nats_1.connect)({ servers: payload.servers });
        const sc = (0, nats_1.StringCodec)();
        for (const m of payload.messages)
            nc.publish(payload.subject, sc.encode(m));
        await nc.drain();
        return { payload: { count: payload.messages.length } };
    },
});
