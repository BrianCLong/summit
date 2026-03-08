"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const configSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(3000),
    LOG_LEVEL: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    SERVICE_NAME: zod_1.z.string().default('golden-service'),
});
exports.config = configSchema.parse(process.env);
