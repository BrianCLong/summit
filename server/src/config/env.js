"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const config_js_1 = require("../config.js");
exports.env = {
    DOCLING_SVC_URL: config_js_1.cfg.DOCLING_SVC_URL,
    DOCLING_SVC_TIMEOUT_MS: config_js_1.cfg.DOCLING_SVC_TIMEOUT_MS,
    CORS_ORIGIN: config_js_1.cfg.CORS_ORIGIN,
    NODE_ENV: config_js_1.cfg.NODE_ENV,
    PORT: config_js_1.cfg.PORT,
};
