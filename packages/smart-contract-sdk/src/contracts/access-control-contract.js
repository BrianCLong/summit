"use strict";
/**
 * Access Control Contract - Manages on-chain access permissions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessControlContract = exports.AccessLevel = void 0;
const base_contract_js_1 = require("./base-contract.js");
var AccessLevel;
(function (AccessLevel) {
    AccessLevel[AccessLevel["None"] = 0] = "None";
    AccessLevel[AccessLevel["Read"] = 1] = "Read";
    AccessLevel[AccessLevel["Write"] = 2] = "Write";
    AccessLevel[AccessLevel["Admin"] = 3] = "Admin";
})(AccessLevel || (exports.AccessLevel = AccessLevel = {}));
class AccessControlContract extends base_contract_js_1.BaseContract {
    constructor(config) {
        super(config);
    }
    async grantAccess(poolId, grantee, accessLevel, expiresAt) {
        return this.sendTransaction('grantAccess', [
            poolId,
            grantee,
            accessLevel,
            expiresAt,
        ]);
    }
    async revokeAccess(poolId, grantee) {
        return this.sendTransaction('revokeAccess', [poolId, grantee]);
    }
    async getAccessGrant(grantId) {
        const result = await this.call('getAccessGrant', [grantId]);
        return {
            grantId: result.grantId,
            poolId: result.poolId,
            grantee: result.grantee,
            accessLevel: Number(result.accessLevel),
            expiresAt: Number(result.expiresAt),
            revoked: result.revoked,
        };
    }
    async checkAccess(poolId, user, requiredLevel) {
        return this.call('checkAccess', [poolId, user, requiredLevel]);
    }
    async updateAccessLevel(poolId, grantee, newLevel) {
        return this.sendTransaction('updateAccessLevel', [poolId, grantee, newLevel]);
    }
    async extendAccess(poolId, grantee, newExpiry) {
        return this.sendTransaction('extendAccess', [poolId, grantee, newExpiry]);
    }
    async getPoolAccessList(poolId) {
        const grants = await this.call('getPoolAccessList', [poolId]);
        return grants.map((g) => ({
            grantId: g.grantId,
            poolId: g.poolId,
            grantee: g.grantee,
            accessLevel: Number(g.accessLevel),
            expiresAt: Number(g.expiresAt),
            revoked: g.revoked,
        }));
    }
    async batchGrantAccess(poolId, grants) {
        return this.sendTransaction('batchGrantAccess', [poolId, grants]);
    }
}
exports.AccessControlContract = AccessControlContract;
