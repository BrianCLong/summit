"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayClient = void 0;
class ReplayClient {
    responses;
    index = 0;
    constructor(responses) {
        this.responses = responses;
    }
    async complete() {
        if (this.index >= this.responses.length) {
            throw new Error('ReplayClient exhausted responses');
        }
        const response = this.responses[this.index];
        this.index += 1;
        return response;
    }
}
exports.ReplayClient = ReplayClient;
