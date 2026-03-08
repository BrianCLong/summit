"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telemetry_js_1 = require("./telemetry.js");
// Initialize telemetry before anything else
const SERVICE_NAME = process.env.SERVICE_NAME || 'service-template';
(0, telemetry_js_1.initTelemetry)(SERVICE_NAME);
const app_js_1 = __importDefault(require("./app.js"));
const logger_js_1 = require("./utils/logger.js");
const PORT = process.env.PORT || 3000;
app_js_1.default.listen(PORT, () => {
    logger_js_1.logger.info(`Service ${SERVICE_NAME} listening on port ${PORT}`);
});
