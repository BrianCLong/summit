"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
async function createContext({ req, }) {
    return {
        authorityId: req.authorityId,
        reasonForAccess: req.reasonForAccess,
        policyWarnings: req.__policyWarnings || [],
        token: req.headers.authorization,
        tenantId: req.headers['x-tenant-id'],
        req,
    };
}
