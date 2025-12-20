import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { router } from '@/switchboard/router';
// Import registry to ensure routes are registered (we will create this file next)
import '@/switchboard/registry';

/**
 * Validate and decode JWT token from authorization header or cookie
 * Returns null if invalid/missing, or decoded payload if valid
 */
async function validateAuthToken(
  request: NextRequest,
): Promise<{ userId: string; tenantId: string } | null> {
  // Check Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    // Fallback to session cookie
    const cookieStore = await cookies();
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
    console.error(
      'Auth validation not fully implemented - rejecting request',
    );
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const routePath = path.join('/');

  // Handle /api/switchboard/dispatch
  if (routePath === 'dispatch') {
    try {
      // Validate authentication BEFORE processing request
      const auth = await validateAuthToken(request);
      if (!auth) {
        return NextResponse.json(
          { error: 'Unauthorized: valid authentication required' },
          { status: 401 },
        );
      }

      const body = await request.json();
      const { routeId, payload } = body;

      if (!routeId) {
        return NextResponse.json({ error: 'routeId is required' }, { status: 400 });
      }

      // Use authenticated context - NEVER trust client-provided headers for identity
      const context = {
        requestId: crypto.randomUUID(),
        source: 'client' as const,
        tenantId: auth.tenantId,
        actor: auth.userId,
      };

      const result = await router.dispatch(routeId, payload, context);
      return NextResponse.json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('Dispatch error:', error);
      // Don't leak error details to client
      return NextResponse.json({
        success: false,
        error: 'Internal Server Error'
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const routePath = path.join('/');

  if (routePath === 'routes') {
      // Only for debugging/admin
      // We need to expose routes from the router.
      // Since router.routes is private, I'll assume we might want to expose a getter later.
      // For now return simple message.
      return NextResponse.json({ message: 'Route listing not implemented yet' });
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
