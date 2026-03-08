"use strict";
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
exports.referenceAdapters = void 0;
const definition_1 = require("./oidc-scim/definition");
const definition_2 = require("./s3-storage/definition");
const definition_3 = require("./webhook-sink/definition");
exports.referenceAdapters = [
    definition_1.oidcScimAdapter,
    definition_2.s3StorageAdapter,
    definition_3.webhookSinkAdapter,
];
__exportStar(require("./types"), exports);
__exportStar(require("./oidc-scim/definition"), exports);
__exportStar(require("./s3-storage/definition"), exports);
__exportStar(require("./webhook-sink/definition"), exports);
