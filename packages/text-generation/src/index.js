"use strict";
/**
 * @intelgraph/text-generation
 * Text data generation and synthesis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamedEntityGenerator = exports.TextSynthesizer = void 0;
var TextSynthesizer_1 = require("./gpt/TextSynthesizer");
Object.defineProperty(exports, "TextSynthesizer", { enumerable: true, get: function () { return TextSynthesizer_1.TextSynthesizer; } });
var NamedEntityGenerator_1 = require("./entities/NamedEntityGenerator");
Object.defineProperty(exports, "NamedEntityGenerator", { enumerable: true, get: function () { return NamedEntityGenerator_1.NamedEntityGenerator; } });
