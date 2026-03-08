"use strict";
/**
 * Benchmark runners for different languages and environments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubprocessRunner = exports.TypeScriptRunner = void 0;
var typescript_js_1 = require("./typescript.js");
Object.defineProperty(exports, "TypeScriptRunner", { enumerable: true, get: function () { return typescript_js_1.TypeScriptRunner; } });
var subprocess_js_1 = require("./subprocess.js");
Object.defineProperty(exports, "SubprocessRunner", { enumerable: true, get: function () { return subprocess_js_1.SubprocessRunner; } });
