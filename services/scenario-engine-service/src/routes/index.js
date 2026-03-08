"use strict";
/**
 * Routes Index
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsRoutes = exports.createWhatIfRoutes = exports.createScenarioRoutes = void 0;
var scenarios_js_1 = require("./scenarios.js");
Object.defineProperty(exports, "createScenarioRoutes", { enumerable: true, get: function () { return scenarios_js_1.createScenarioRoutes; } });
var whatif_js_1 = require("./whatif.js");
Object.defineProperty(exports, "createWhatIfRoutes", { enumerable: true, get: function () { return whatif_js_1.createWhatIfRoutes; } });
var analytics_js_1 = require("./analytics.js");
Object.defineProperty(exports, "createAnalyticsRoutes", { enumerable: true, get: function () { return analytics_js_1.createAnalyticsRoutes; } });
