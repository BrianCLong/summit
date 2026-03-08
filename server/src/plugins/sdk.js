"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = createPlugin;
function createPlugin(name, run) {
    return { name, run };
}
