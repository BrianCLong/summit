"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadowService = exports.ShadowService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class ShadowService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ShadowService.instance) {
            ShadowService.instance = new ShadowService();
        }
        return ShadowService.instance;
    }
    /**
     * Async shadow request. Fires and forgets (but logs).
     */
    shadow(req, config) {
        const { method, url, headers, body } = req;
        // Strip potentially sensitive or conflicting headers
        const shadowHeaders = { ...headers };
        delete shadowHeaders['host'];
        delete shadowHeaders['content-length'];
        // Add shadow marker
        shadowHeaders['X-Summit-Shadow-Request'] = 'true';
        const targetUrl = `${config.targetUrl}${url}`;
        logger_js_1.default.info({ targetUrl, method }, 'ShadowService: Mirroring traffic');
        (0, axios_1.default)({
            method,
            url: targetUrl,
            headers: shadowHeaders,
            data: body,
            timeout: 5000,
        }).then(response => {
            logger_js_1.default.debug({
                targetUrl,
                status: response.status,
                // comparison would go here if enabled
            }, 'ShadowService: Shadow request successful');
        }).catch(err => {
            logger_js_1.default.warn({
                targetUrl,
                error: err.message
            }, 'ShadowService: Shadow request failed');
        });
    }
}
exports.ShadowService = ShadowService;
exports.shadowService = ShadowService.getInstance();
