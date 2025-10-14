import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { getPostgresPool } from "../db/postgres.js";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
const logger = pino();
const JWT_SECRET = process.env.JWT_SECRET ||
    "dev_jwt_secret_12345_very_long_secret_for_development";
export const getContext = async ({ req, }) => {
    const requestId = uuidv4();
    try {
        const token = extractToken(req);
        if (!token) {
            logger.info({ requestId }, "Unauthenticated request");
            return { isAuthenticated: false, requestId };
        }
        const user = await verifyToken(token);
        logger.info({ requestId, userId: user.id }, "Authenticated request");
        return { user, isAuthenticated: true, requestId };
    }
    catch (error) {
        logger.warn({ requestId, error: error.message }, "Authentication failed");
        return { isAuthenticated: false, requestId };
    }
};
export const verifyToken = async (token) => {
    try {
        // For development, accept a simple test token
        if (process.env.NODE_ENV === "development" && token === "dev-token") {
            return {
                id: "dev-user-1",
                email: "developer@intelgraph.com",
                username: "developer",
                role: "ADMIN",
            };
        }
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        // Get user from database
        const pool = getPostgresPool();
        const result = await pool.query("SELECT id, email, username, role FROM users WHERE id = $1", [decoded.userId]);
        if (result.rows.length === 0) {
            throw new Error("User not found");
        }
        return result.rows[0];
    }
    catch (error) {
        throw new GraphQLError("Invalid or expired token", {
            extensions: {
                code: "UNAUTHENTICATED",
                http: { status: 401 },
            },
        });
    }
};
export const generateToken = (user) => {
    return jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
    }, JWT_SECRET, { expiresIn: "1h" });
};
export const requireAuth = (context) => {
    if (!context.isAuthenticated || !context.user) {
        throw new GraphQLError("Authentication required", {
            extensions: {
                code: "UNAUTHENTICATED",
                http: { status: 401 },
            },
        });
    }
    return context.user;
};
export const requireRole = (context, requiredRole) => {
    const user = requireAuth(context);
    if (user.role !== requiredRole && user.role !== "ADMIN") {
        throw new GraphQLError("Insufficient permissions", {
            extensions: {
                code: "FORBIDDEN",
                http: { status: 403 },
            },
        });
    }
    return user;
};
function extractToken(req) {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    return null;
}
//# sourceMappingURL=auth.js.map