"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseVisualizationExtension = void 0;
/**
 * Base class for visualization extensions
 */
class BaseVisualizationExtension {
    id;
    name;
    description;
    componentPath;
    type = 'visualization';
    constructor(id, name, description, componentPath) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.componentPath = componentPath;
    }
}
exports.BaseVisualizationExtension = BaseVisualizationExtension;
