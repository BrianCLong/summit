"use strict";
/**
 * Routing Module Exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackRouter = exports.CircuitBreakerRegistry = exports.CircuitBreaker = void 0;
var CircuitBreaker_js_1 = require("./CircuitBreaker.js");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return CircuitBreaker_js_1.CircuitBreaker; } });
Object.defineProperty(exports, "CircuitBreakerRegistry", { enumerable: true, get: function () { return CircuitBreaker_js_1.CircuitBreakerRegistry; } });
var FallbackRouter_js_1 = require("./FallbackRouter.js");
Object.defineProperty(exports, "FallbackRouter", { enumerable: true, get: function () { return FallbackRouter_js_1.FallbackRouter; } });
