"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ff = void 0;
exports.enabled = enabled;
const server_sdk_1 = require("@openfeature/server-sdk");
exports.ff = server_sdk_1.OpenFeature.getClient('symphony');
async function enabled(flag, defaultValue = false) {
    try {
        return await exports.ff.getBooleanValue(flag, defaultValue);
    }
    catch {
        return defaultValue;
    }
}
