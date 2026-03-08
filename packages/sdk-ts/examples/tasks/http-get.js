"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
exports.default = (0, maestro_sdk_1.defineTask)({
    async validate(input) {
        if (!input.payload?.url) {
            throw new Error('url is required');
        }
    },
    async execute(ctx, input) {
        const res = await fetch(input.payload.url);
        const body = await res.text();
        ctx.logger.info('http-get', { status: res.status, bytes: body.length });
        await ctx.emit('http_get.done', { status: res.status });
        return { payload: { status: res.status, body } };
    },
});
// Local demo
if (process.env.NODE_ENV === 'development') {
    const ctx = (0, maestro_sdk_1.createRunContext)({});
    const task = (await Promise.resolve().then(() => __importStar(require('./http-get.ts')))).default;
    task
        .execute(ctx, { payload: { url: 'https://example.com' } })
        .then((r) => ctx.logger.info('http-get.demo', r));
}
