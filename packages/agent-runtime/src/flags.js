"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLAGS = void 0;
exports.FLAGS = {
    POLICY_ENGINE_ENABLED: process.env.POLICY_ENGINE_ENABLED === "true",
    BROWSER_BRIDGE_ENABLED: process.env.BROWSER_BRIDGE_ENABLED === "true",
    CAP_LEASE_ENABLED: process.env.CAP_LEASE_ENABLED === "true",
    GATEWAY_ENABLED: process.env.GATEWAY_ENABLED === "true"
};
