"use strict";
/**
 * AI Governance LLM Module
 *
 * Exports LLM client and utilities for AI-assisted governance.
 *
 * @module ai/governance/llm
 * @version 4.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGovernanceLLMClient = exports.getGovernanceLLMClient = exports.GovernanceLLMError = exports.GovernanceLLMClient = void 0;
var GovernanceLLMClient_js_1 = require("./GovernanceLLMClient.js");
Object.defineProperty(exports, "GovernanceLLMClient", { enumerable: true, get: function () { return GovernanceLLMClient_js_1.GovernanceLLMClient; } });
Object.defineProperty(exports, "GovernanceLLMError", { enumerable: true, get: function () { return GovernanceLLMClient_js_1.GovernanceLLMError; } });
Object.defineProperty(exports, "getGovernanceLLMClient", { enumerable: true, get: function () { return GovernanceLLMClient_js_1.getGovernanceLLMClient; } });
Object.defineProperty(exports, "createGovernanceLLMClient", { enumerable: true, get: function () { return GovernanceLLMClient_js_1.createGovernanceLLMClient; } });
