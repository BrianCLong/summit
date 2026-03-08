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
exports.version = void 0;
exports.version = '1.0.0';
__exportStar(require("./types"), exports);
__exportStar(require("./optimizer/cost-model"), exports);
__exportStar(require("./optimizer/planner"), exports);
__exportStar(require("./materialized/ims-manager"), exports);
// Export legacy manager if needed, but we are focusing on the new graph stuff
__exportStar(require("./materialized/mv-manager"), exports);
__exportStar(require("./optimizer-manager"), exports);
