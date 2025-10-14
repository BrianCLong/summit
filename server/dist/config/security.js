export const jwtIssuer = process.env.JWT_ISSUER || "intelgraph";
export const pbacRoles = {
    analyst: ["read:investigations", "read:graph"],
    admin: ["*"],
};
//# sourceMappingURL=security.js.map