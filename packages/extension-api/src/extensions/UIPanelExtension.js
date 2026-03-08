"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseUIPanelExtension = void 0;
class BaseUIPanelExtension {
    id;
    location;
    componentId;
    requiredScopes;
    type = 'ui-panel';
    constructor(id, location, componentId, requiredScopes = []) {
        this.id = id;
        this.location = location;
        this.componentId = componentId;
        this.requiredScopes = requiredScopes;
    }
}
exports.BaseUIPanelExtension = BaseUIPanelExtension;
