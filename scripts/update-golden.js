#!/usr/bin/env ts-node --esm
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const index_js_1 = require("../packages/provenance/src/index.js");
const index_js_2 = require("../services/policy-engine/src/index.js");
const samples_js_1 = require("../test/fixtures/golden/samples.js");
const fixtureDir = path_1.default.resolve(new URL('.', import.meta.url).pathname, '../test/fixtures/golden');
(0, fs_1.mkdirSync)(fixtureDir, { recursive: true });
const receipt = (0, samples_js_1.buildSampleReceipt)();
const canonicalReceipt = (0, index_js_1.canonicalizeReceiptPayload)(receipt);
(0, fs_1.writeFileSync)(path_1.default.join(fixtureDir, 'receipt_v0_1.json'), `${canonicalReceipt}\n`);
const policyDecision = (0, samples_js_1.buildSamplePolicyDecision)();
const serializedDecision = (0, index_js_2.serializePolicyDecision)(policyDecision);
(0, fs_1.writeFileSync)(path_1.default.join(fixtureDir, 'policy_decision_v0_1.json'), `${serializedDecision}\n`);
console.log(`Updated golden fixtures in ${fixtureDir}`);
