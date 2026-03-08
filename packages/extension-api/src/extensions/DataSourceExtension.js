"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDataSourceExtension = void 0;
/**
 * Base class for data source extensions
 */
class BaseDataSourceExtension {
    id;
    config;
    type = 'data-source';
    constructor(id, config) {
        this.id = id;
        this.config = config;
    }
}
exports.BaseDataSourceExtension = BaseDataSourceExtension;
