"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEnvironment = void 0;
const uuid_1 = require("uuid");
class BaseEnvironment {
    _seed = Date.now();
    _episodeId = '';
    constructor(seed) {
        if (seed !== undefined) {
            this._seed = seed;
        }
    }
    seed(seed) {
        this._seed = seed;
    }
    async reset(options) {
        this._episodeId = (0, uuid_1.v4)();
        return this._reset(options);
    }
    async step(action) {
        return this._step(action);
    }
    async close() {
        // No-op by default
    }
}
exports.BaseEnvironment = BaseEnvironment;
