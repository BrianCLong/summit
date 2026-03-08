"use strict";
/**
 * Matchers Module
 *
 * Exports all matcher implementations and factory functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProbabilisticMatchers = exports.NationalityMatcher = exports.GenderMatcher = exports.AddressMatcher = exports.DateOfBirthMatcher = exports.NameMatcher = exports.createDeterministicMatchers = exports.AccountNumberMatcher = exports.TaxIdMatcher = exports.DeviceIdMatcher = exports.PhoneMatcher = exports.EmailMatcher = exports.PassportMatcher = exports.NationalIdMatcher = exports.valuesEqual = exports.extractValue = exports.normalizeString = exports.BaseMatcher = void 0;
var base_js_1 = require("./base.js");
Object.defineProperty(exports, "BaseMatcher", { enumerable: true, get: function () { return base_js_1.BaseMatcher; } });
Object.defineProperty(exports, "normalizeString", { enumerable: true, get: function () { return base_js_1.normalizeString; } });
Object.defineProperty(exports, "extractValue", { enumerable: true, get: function () { return base_js_1.extractValue; } });
Object.defineProperty(exports, "valuesEqual", { enumerable: true, get: function () { return base_js_1.valuesEqual; } });
var deterministic_js_1 = require("./deterministic.js");
Object.defineProperty(exports, "NationalIdMatcher", { enumerable: true, get: function () { return deterministic_js_1.NationalIdMatcher; } });
Object.defineProperty(exports, "PassportMatcher", { enumerable: true, get: function () { return deterministic_js_1.PassportMatcher; } });
Object.defineProperty(exports, "EmailMatcher", { enumerable: true, get: function () { return deterministic_js_1.EmailMatcher; } });
Object.defineProperty(exports, "PhoneMatcher", { enumerable: true, get: function () { return deterministic_js_1.PhoneMatcher; } });
Object.defineProperty(exports, "DeviceIdMatcher", { enumerable: true, get: function () { return deterministic_js_1.DeviceIdMatcher; } });
Object.defineProperty(exports, "TaxIdMatcher", { enumerable: true, get: function () { return deterministic_js_1.TaxIdMatcher; } });
Object.defineProperty(exports, "AccountNumberMatcher", { enumerable: true, get: function () { return deterministic_js_1.AccountNumberMatcher; } });
Object.defineProperty(exports, "createDeterministicMatchers", { enumerable: true, get: function () { return deterministic_js_1.createDeterministicMatchers; } });
var probabilistic_js_1 = require("./probabilistic.js");
Object.defineProperty(exports, "NameMatcher", { enumerable: true, get: function () { return probabilistic_js_1.NameMatcher; } });
Object.defineProperty(exports, "DateOfBirthMatcher", { enumerable: true, get: function () { return probabilistic_js_1.DateOfBirthMatcher; } });
Object.defineProperty(exports, "AddressMatcher", { enumerable: true, get: function () { return probabilistic_js_1.AddressMatcher; } });
Object.defineProperty(exports, "GenderMatcher", { enumerable: true, get: function () { return probabilistic_js_1.GenderMatcher; } });
Object.defineProperty(exports, "NationalityMatcher", { enumerable: true, get: function () { return probabilistic_js_1.NationalityMatcher; } });
Object.defineProperty(exports, "createProbabilisticMatchers", { enumerable: true, get: function () { return probabilistic_js_1.createProbabilisticMatchers; } });
