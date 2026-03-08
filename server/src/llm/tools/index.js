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
exports.defaultToolRegistry = void 0;
const registry_js_1 = require("./registry.js");
const retrieval_tool_js_1 = require("./retrieval-tool.js");
__exportStar(require("./registry.js"), exports);
__exportStar(require("./retrieval-tool.js"), exports);
exports.defaultToolRegistry = new registry_js_1.ToolRegistry();
exports.defaultToolRegistry.register(retrieval_tool_js_1.retrievalTool);
