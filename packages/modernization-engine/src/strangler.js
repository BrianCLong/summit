"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StranglerAdapter = void 0;
const errors_js_1 = require("./errors.js");
class StranglerAdapter {
    domain;
    shadowConfig;
    constructor(domain, shadowConfig) {
        this.domain = domain;
        this.shadowConfig = shadowConfig;
    }
    routeRequest(path, payload) {
        const isWritePath = this.domain.commands.some((cmd) => cmd.path === path);
        if (isWritePath && !this.shadowConfig.allowWrites) {
            throw new errors_js_1.BoundaryViolationError(`Write attempts blocked during shadowing for ${this.domain.name}`);
        }
        const target = Math.random() * 100 < this.shadowConfig.shadowPercentage ? 'legacy' : 'modern';
        return { destination: target, payload };
    }
    enforceCompatibility(descriptor) {
        const violatingWrite = descriptor.writes.find((write) => write.domain === this.domain.name && !write.viaAdapter);
        if (violatingWrite) {
            throw new errors_js_1.BoundaryViolationError(`Direct write to ${violatingWrite.resource} bypasses adapter`);
        }
    }
}
exports.StranglerAdapter = StranglerAdapter;
