"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvidence = exports.getLatestEvidence = void 0;
// Mock for evidenceRepo
exports.getLatestEvidence = jest.fn(async () => []);
exports.listEvidence = jest.fn(async () => []);
