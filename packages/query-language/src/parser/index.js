"use strict";
/**
 * Parser Module Exports
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parserInstance = exports.parse = exports.tokenize = void 0;
__exportStar(require("./lexer.js"), exports);
__exportStar(require("./parser.js"), exports);
var lexer_js_1 = require("./lexer.js");
Object.defineProperty(exports, "tokenize", { enumerable: true, get: function () { return lexer_js_1.tokenize; } });
var parser_js_1 = require("./parser.js");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parser_js_1.parse; } });
Object.defineProperty(exports, "parserInstance", { enumerable: true, get: function () { return parser_js_1.parserInstance; } });
