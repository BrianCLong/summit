"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const under_pressure_1 = __importDefault(require("@fastify/under-pressure"));
const api_1 = require("./api");
const telemetry_1 = require("./telemetry");
const httpSse_1 = require("./transport/httpSse");
async function main() {
    const app = (0, fastify_1.default)({ logger: true });
    await (0, telemetry_1.initTelemetry)('runtime-pooler');
    app.register(under_pressure_1.default, {
        maxEventLoopDelay: 100,
        maxHeapUsedBytes: 1024 * 1024 * 1024,
        retryAfter: 30,
    });
    (0, api_1.registerApi)(app);
    (0, httpSse_1.registerSse)(app);
    const port = Number(process.env.PORT || 8080);
    await app.listen({ port, host: '0.0.0.0' });
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
