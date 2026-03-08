"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const headers_1 = require("next/headers");
const router_1 = require("@/switchboard/router");
// Import registry to ensure routes are registered (we will create this file next)
require("@/switchboard/registry");
/**
 * Validate and decode JWT token from authorization header or cookie
 * Returns null if invalid/missing, or decoded payload if valid
 */
async function validateAuthToken(request) {
    // Check Authorization header first (Bearer token)
    const authHeader = request.headers.get('authorization');
    let token;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    }
    else {
        // Fallback to session cookie
        const cookieStore = await (0, headers_1.cookies)();
        token = cookieStore.get('session_token')?.value;
    }
    if (!token) {
        return null;
    }
    try {
        // TODO: Replace with actual JWT verification using your auth library
        // This should verify signature, expiration, and issuer
        // Example with jose library:
        // const { payload } = await jwtVerify(token, secretKey, { issuer: 'your-issuer' });
        // return { userId: payload.sub, tenantId: payload.tenant_id };
        // For now, reject all requests until proper auth is implemented
        // This is a security-first approach - fail closed rather than open
        console.error('Auth validation not fully implemented - rejecting request');
        return null;
    }
    catch {
        return null;
    }
}
async function POST(request, { params }) {
    const path = params.path || [];
    const routePath = path.join('/');
    // Handle /api/switchboard/dispatch
    if (routePath === 'dispatch') {
        try {
            // Validate authentication BEFORE processing request
            const auth = await validateAuthToken(request);
            if (!auth) {
                return server_1.NextResponse.json({ error: 'Unauthorized: valid authentication required' }, { status: 401 });
            }
            const body = await request.json();
            const { routeId, payload } = body;
            if (!routeId) {
                return server_1.NextResponse.json({ error: 'routeId is required' }, { status: 400 });
            }
            // Use authenticated context - NEVER trust client-provided headers for identity
            const context = {
                requestId: crypto.randomUUID(),
                source: 'client',
                tenantId: auth.tenantId,
                actor: auth.userId,
            };
            const result = await router_1.router.dispatch(routeId, payload, context);
            return server_1.NextResponse.json({ success: true, data: result });
        }
        catch (error) {
            console.error('Dispatch error:', error);
            // Don't leak error details to client
            return server_1.NextResponse.json({
                success: false,
                error: 'Internal Server Error'
            }, { status: 500 });
        }
    }
    return server_1.NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
async function GET(request, { params }) {
    const path = params.path || [];
    const routePath = path.join('/');
    if (routePath === 'routes') {
        // Only for debugging/admin
        // We need to expose routes from the router.
        // Since router.routes is private, I'll assume we might want to expose a getter later.
        // For now return simple message.
        return server_1.NextResponse.json({ message: 'Route listing not implemented yet' });
    }
    return server_1.NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
