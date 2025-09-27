export const jwtIssuer = process.env.JWT_ISSUER || "intelgraph";

export const pbacRoles: Record<string, string[]> = {
  analyst: ["read:investigations", "read:graph"],
  admin: ["*"],
};
