"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const isDev = process.env.NODE_ENV === 'development';
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    defaultMeta: {
        service: '@intelgraph/api-gateway',
        env: process.env.NODE_ENV || 'development',
    },
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), isDev
        ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        : winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        ...(isDev
            ? []
            : [
                new winston_1.default.transports.File({
                    filename: 'error.log',
                    level: 'error',
                }),
                new winston_1.default.transports.File({ filename: 'combined.log' }),
            ]),
    ],
});
