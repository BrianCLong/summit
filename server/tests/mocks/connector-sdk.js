"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnector = exports.BaseConnector = void 0;
const globals_1 = require("@jest/globals");
class BaseConnector {
    constructor(config) { }
    connect = globals_1.jest.fn().mockResolvedValue(undefined);
    disconnect = globals_1.jest.fn().mockResolvedValue(undefined);
    healthCheck = globals_1.jest.fn().mockResolvedValue({ status: 'healthy' });
}
exports.BaseConnector = BaseConnector;
exports.createConnector = globals_1.jest.fn().mockReturnValue(new BaseConnector({}));
exports.default = { BaseConnector, createConnector: exports.createConnector };
