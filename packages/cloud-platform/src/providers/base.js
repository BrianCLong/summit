"use strict";
/**
 * Base Cloud Provider
 * Abstract base class for all cloud providers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCloudProvider = void 0;
class BaseCloudProvider {
    provider;
    config;
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
    }
    getProvider() {
        return this.provider;
    }
    getConfig() {
        return this.config;
    }
}
exports.BaseCloudProvider = BaseCloudProvider;
