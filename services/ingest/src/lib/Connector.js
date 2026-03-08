"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connector = void 0;
class Connector {
    config;
    connected = false;
    constructor(config) {
        this.config = config;
    }
}
exports.Connector = Connector;
