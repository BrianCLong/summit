"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleFeedCollector = void 0;
const globals_1 = require("@jest/globals");
class SimpleFeedCollector {
    config;
    constructor(config) {
        this.config = config;
    }
    initialize = globals_1.jest.fn().mockResolvedValue(undefined);
    collect = globals_1.jest.fn().mockResolvedValue([]);
    shutdown = globals_1.jest.fn().mockResolvedValue(undefined);
}
exports.SimpleFeedCollector = SimpleFeedCollector;
