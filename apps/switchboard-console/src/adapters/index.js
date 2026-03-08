"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAdapters = exports.adapterById = exports.defaultAdapters = void 0;
const ClaudeAdapter_1 = require("./ClaudeAdapter");
const CodexAdapter_1 = require("./CodexAdapter");
const FakeAdapter_1 = require("./FakeAdapter");
const GeminiAdapter_1 = require("./GeminiAdapter");
const defaultAdapters = () => [
    new CodexAdapter_1.CodexAdapter(),
    new ClaudeAdapter_1.ClaudeAdapter(),
    new GeminiAdapter_1.GeminiAdapter(),
];
exports.defaultAdapters = defaultAdapters;
const adapterById = (adapters, id) => adapters.find((adapter) => adapter.id === id);
exports.adapterById = adapterById;
const testAdapters = () => [new FakeAdapter_1.FakeAdapter()];
exports.testAdapters = testAdapters;
