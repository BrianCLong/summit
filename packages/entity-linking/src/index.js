"use strict";
/**
 * @intelgraph/entity-linking
 * Entity extraction, disambiguation, and linking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityLinker = exports.NamedEntityRecognizer = void 0;
// NER
var NamedEntityRecognizer_js_1 = require("./ner/NamedEntityRecognizer.js");
Object.defineProperty(exports, "NamedEntityRecognizer", { enumerable: true, get: function () { return NamedEntityRecognizer_js_1.NamedEntityRecognizer; } });
// Entity Linking
var EntityLinker_js_1 = require("./linking/EntityLinker.js");
Object.defineProperty(exports, "EntityLinker", { enumerable: true, get: function () { return EntityLinker_js_1.EntityLinker; } });
