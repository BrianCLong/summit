"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.features = void 0;
exports.features = {
    check(flag) {
        // Simple env-based toggle: FEATURE_FLAG_NAME=true
        const envKey = `FEATURE_${flag.toUpperCase()}`;
        return process.env[envKey] === 'true';
    },
};
