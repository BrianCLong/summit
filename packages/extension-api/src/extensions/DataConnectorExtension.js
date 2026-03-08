"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDataConnectorExtension = void 0;
class BaseDataConnectorExtension {
    id;
    connectorType;
    capabilities;
    requiredScopes;
    type = 'data-connector';
    constructor(id, connectorType, capabilities, requiredScopes = []) {
        this.id = id;
        this.connectorType = connectorType;
        this.capabilities = capabilities;
        this.requiredScopes = requiredScopes;
    }
}
exports.BaseDataConnectorExtension = BaseDataConnectorExtension;
