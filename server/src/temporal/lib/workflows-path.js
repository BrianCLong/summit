"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
// Export a dummy workflows path to satisfy worker.create without bundling
// In a real deployment, point to compiled JS workflows
exports.default = new URL('./workflows.js', import.meta.url).pathname;
