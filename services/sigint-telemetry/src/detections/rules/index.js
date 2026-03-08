"use strict";
/**
 * Detection Rules Index
 *
 * Exports all built-in detection rules.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allRules = void 0;
__exportStar(require("./identity.js"), exports);
__exportStar(require("./network.js"), exports);
__exportStar(require("./endpoint.js"), exports);
__exportStar(require("./cloud.js"), exports);
const identity_js_1 = require("./identity.js");
const network_js_1 = require("./network.js");
const endpoint_js_1 = require("./endpoint.js");
const cloud_js_1 = require("./cloud.js");
/** All built-in detection rules */
exports.allRules = [
    ...identity_js_1.identityRules,
    ...network_js_1.networkRules,
    ...endpoint_js_1.endpointRules,
    ...cloud_js_1.cloudRules,
];
