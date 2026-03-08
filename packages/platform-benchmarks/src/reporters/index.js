"use strict";
/**
 * Benchmark result reporters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvReporter = exports.MarkdownReporter = exports.JsonReporter = exports.ConsoleReporter = void 0;
var console_js_1 = require("./console.js");
Object.defineProperty(exports, "ConsoleReporter", { enumerable: true, get: function () { return console_js_1.ConsoleReporter; } });
var json_js_1 = require("./json.js");
Object.defineProperty(exports, "JsonReporter", { enumerable: true, get: function () { return json_js_1.JsonReporter; } });
var markdown_js_1 = require("./markdown.js");
Object.defineProperty(exports, "MarkdownReporter", { enumerable: true, get: function () { return markdown_js_1.MarkdownReporter; } });
var csv_js_1 = require("./csv.js");
Object.defineProperty(exports, "CsvReporter", { enumerable: true, get: function () { return csv_js_1.CsvReporter; } });
