"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const config_js_1 = require("./config.js");
exports.logger = (0, pino_1.default)({
    level: config_js_1.config.LOG_LEVEL,
    name: config_js_1.config.SERVICE_NAME,
});
