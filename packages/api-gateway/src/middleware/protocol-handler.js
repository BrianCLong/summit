"use strict";
// @ts-nocheck
/**
 * Protocol Handler Middleware
 *
 * Handles multiple protocols: HTTP/HTTPS, WebSocket, gRPC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolHandler = exports.Protocol = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('protocol-handler');
var Protocol;
(function (Protocol) {
    Protocol["HTTP"] = "HTTP";
    Protocol["HTTPS"] = "HTTPS";
    Protocol["WEBSOCKET"] = "WEBSOCKET";
    Protocol["GRPC"] = "GRPC";
    Protocol["HTTP2"] = "HTTP2";
})(Protocol || (exports.Protocol = Protocol = {}));
class ProtocolHandler {
    config;
    constructor(config) {
        this.config = config;
    }
    detectProtocol(req) {
        // Check for WebSocket upgrade
        if (this.isWebSocketUpgrade(req)) {
            return Protocol.WEBSOCKET;
        }
        // Check for gRPC (content-type: application/grpc)
        const contentType = req.headers['content-type'];
        if (contentType?.includes('application/grpc')) {
            return Protocol.GRPC;
        }
        // Check for HTTP/2
        if (req.httpVersion === '2.0') {
            return Protocol.HTTP2;
        }
        // Default to HTTP/HTTPS
        return req.socket.encrypted ? Protocol.HTTPS : Protocol.HTTP;
    }
    isSupported(protocol) {
        return this.config.supportedProtocols.includes(protocol);
    }
    isWebSocketUpgrade(req) {
        return (req.headers.upgrade?.toLowerCase() === 'websocket' &&
            req.headers.connection?.toLowerCase().includes('upgrade'));
    }
    async handleProtocol(req, res, protocol) {
        if (!this.isSupported(protocol)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Protocol not supported' }));
            return;
        }
        logger.debug('Handling protocol', { protocol, url: req.url });
        switch (protocol) {
            case Protocol.HTTP:
            case Protocol.HTTPS:
                return this.handleHTTP(req, res);
            case Protocol.WEBSOCKET:
                return this.handleWebSocket(req, res);
            case Protocol.GRPC:
                return this.handleGRPC(req, res);
            case Protocol.HTTP2:
                return this.handleHTTP2(req, res);
        }
    }
    async handleHTTP(req, res) {
        // HTTP handling is done by the main gateway
        logger.debug('HTTP request', { method: req.method, url: req.url });
    }
    async handleWebSocket(req, res) {
        logger.info('WebSocket upgrade requested', { url: req.url });
        // WebSocket upgrade handling would be implemented here
        // This would typically use the 'ws' library
    }
    async handleGRPC(req, res) {
        logger.info('gRPC request', { url: req.url });
        // gRPC handling would be implemented here
        // This would typically use @grpc/grpc-js
    }
    async handleHTTP2(req, res) {
        logger.debug('HTTP/2 request', { method: req.method, url: req.url });
        // HTTP/2 specific handling
    }
}
exports.ProtocolHandler = ProtocolHandler;
