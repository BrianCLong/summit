"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const index_js_1 = require("../src/index.js");
const client = new index_js_1.FhemClient();
const first = client.encrypt([11]);
const second = client.encrypt([11]);
strict_1.default.equal(first.ciphertexts.length, 1);
strict_1.default.equal(second.ciphertexts.length, 1);
strict_1.default.deepEqual(first.ciphertexts, second.ciphertexts);
console.log('Deterministic ciphertext check passed.');
