"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAuthProviderExtension = void 0;
class BaseAuthProviderExtension {
    id;
    providerName;
    type = 'auth-provider';
    constructor(id, providerName) {
        this.id = id;
        this.providerName = providerName;
    }
    async execute(request) {
        switch (request.type) {
            case 'login':
                return this.authenticate(request.credentials);
            case 'validate':
                const valid = await this.validate(request.credentials.token);
                return { success: valid };
            case 'refresh':
                return this.refresh(request.credentials.refreshToken);
            default:
                return { success: false, error: 'Unknown request type' };
        }
    }
}
exports.BaseAuthProviderExtension = BaseAuthProviderExtension;
