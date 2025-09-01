export class SAMLProvider {
    constructor(config) {
        this.config = config;
    }
    validateMetadata(xml) {
        if (!xml.includes('<EntityDescriptor')) {
            throw new Error('invalid metadata');
        }
    }
    mapRoles(attrs) {
        const mapped = [];
        for (const [attr, roles] of Object.entries(this.config.roles)) {
            if (attrs[attr])
                mapped.push(...roles);
        }
        return mapped;
    }
}
//# sourceMappingURL=SAMLProvider.js.map