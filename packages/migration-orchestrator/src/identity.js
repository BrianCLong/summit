"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class IdentityService {
    constructor() {
        this.identities = new Map();
        this.domainIndex = new Map();
        this.scimIndex = new Map();
    }
    mapUser({ userId, orgId, domains, scimIds, provenance }) {
        const existingGuid = this.findExistingGuid(domains, scimIds);
        const guid = existingGuid ?? node_crypto_1.default.randomUUID();
        const mergedIdentity = this.mergeIdentity(guid, {
            guid,
            userId,
            orgId,
            domains,
            scimIds,
            provenance,
        });
        this.identities.set(guid, mergedIdentity);
        mergedIdentity.domains.forEach((domain) => this.domainIndex.set(domain, guid));
        mergedIdentity.scimIds.forEach((id) => this.scimIndex.set(id, guid));
        return mergedIdentity;
    }
    linkDomain(guid, domain) {
        const identity = this.identities.get(guid);
        if (!identity) {
            throw new Error(`Unknown identity ${guid}`);
        }
        if (!identity.domains.includes(domain)) {
            identity.domains.push(domain);
            identity.provenance.push(`domain-linked:${domain}`);
            this.domainIndex.set(domain, guid);
        }
    }
    findExistingGuid(domains, scimIds) {
        for (const domain of domains) {
            const guid = this.domainIndex.get(domain);
            if (guid)
                return guid;
        }
        for (const scimId of scimIds) {
            const guid = this.scimIndex.get(scimId);
            if (guid)
                return guid;
        }
        return undefined;
    }
    mergeIdentity(guid, incoming) {
        const existing = this.identities.get(guid);
        if (!existing)
            return incoming;
        return {
            guid,
            userId: existing.userId ?? incoming.userId,
            orgId: existing.orgId ?? incoming.orgId,
            domains: Array.from(new Set([...existing.domains, ...incoming.domains])),
            scimIds: Array.from(new Set([...existing.scimIds, ...incoming.scimIds])),
            provenance: [...existing.provenance, ...incoming.provenance],
        };
    }
    getIdentity(guid) {
        return this.identities.get(guid);
    }
}
exports.IdentityService = IdentityService;
