"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConnector = void 0;
exports.createEmitter = createEmitter;
class BaseConnector {
    async run(_ctx) {
        /* override in subclass */
    }
}
exports.BaseConnector = BaseConnector;
function createEmitter(stream) {
    return (record) => {
        stream.write(JSON.stringify(record) + '\n');
    };
}
