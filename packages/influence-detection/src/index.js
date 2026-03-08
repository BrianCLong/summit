"use strict";
/**
 * @intelgraph/influence-detection
 * Bot detection, coordinated inauthentic behavior, and astroturfing detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmplificationDetector = exports.AstroturfingDetector = exports.CIBDetector = exports.BotDetector = void 0;
var BotDetector_js_1 = require("./bot-detection/BotDetector.js");
Object.defineProperty(exports, "BotDetector", { enumerable: true, get: function () { return BotDetector_js_1.BotDetector; } });
var CIBDetector_js_1 = require("./cib/CIBDetector.js");
Object.defineProperty(exports, "CIBDetector", { enumerable: true, get: function () { return CIBDetector_js_1.CIBDetector; } });
var AstroturfingDetector_js_1 = require("./astroturfing/AstroturfingDetector.js");
Object.defineProperty(exports, "AstroturfingDetector", { enumerable: true, get: function () { return AstroturfingDetector_js_1.AstroturfingDetector; } });
var AmplificationDetector_js_1 = require("./amplification/AmplificationDetector.js");
Object.defineProperty(exports, "AmplificationDetector", { enumerable: true, get: function () { return AmplificationDetector_js_1.AmplificationDetector; } });
