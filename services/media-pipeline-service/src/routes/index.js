"use strict";
/**
 * Routes - Public API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRoutes = exports.transcriptRoutes = exports.mediaRoutes = exports.healthRoutes = void 0;
var health_routes_js_1 = require("./health.routes.js");
Object.defineProperty(exports, "healthRoutes", { enumerable: true, get: function () { return health_routes_js_1.healthRoutes; } });
var media_routes_js_1 = require("./media.routes.js");
Object.defineProperty(exports, "mediaRoutes", { enumerable: true, get: function () { return media_routes_js_1.mediaRoutes; } });
var transcript_routes_js_1 = require("./transcript.routes.js");
Object.defineProperty(exports, "transcriptRoutes", { enumerable: true, get: function () { return transcript_routes_js_1.transcriptRoutes; } });
var providers_routes_js_1 = require("./providers.routes.js");
Object.defineProperty(exports, "providerRoutes", { enumerable: true, get: function () { return providers_routes_js_1.providerRoutes; } });
