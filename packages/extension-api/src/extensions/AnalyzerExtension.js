"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAnalyzerExtension = void 0;
/**
 * Base class for analyzer extensions
 */
class BaseAnalyzerExtension {
    id;
    name;
    description;
    supportedDataTypes;
    type = 'analyzer';
    constructor(id, name, description, supportedDataTypes) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.supportedDataTypes = supportedDataTypes;
    }
}
exports.BaseAnalyzerExtension = BaseAnalyzerExtension;
