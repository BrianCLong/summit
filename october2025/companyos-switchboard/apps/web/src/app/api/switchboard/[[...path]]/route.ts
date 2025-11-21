import { NextRequest, NextResponse } from 'next/server';
import { router } from '@/switchboard/router';
// Import registry to ensure routes are registered (we will create this file next)
import '@/switchboard/registry';

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const routePath = path.join('/');

  // Handle /api/switchboard/dispatch
  if (routePath === 'dispatch') {
    try {
      const body = await request.json();
      const { routeId, payload } = body;

      if (!routeId) {
        return NextResponse.json({ error: 'routeId is required' }, { status: 400 });
      }

      // TODO: Implement proper authentication and authorization here.
      // Currently, we rely on headers, but this should be validated against a session or token.
      // const session = await getSession(request);
      // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const context = {
        requestId: crypto.randomUUID(),
        source: 'client' as const,
        // In a real app, extract these from headers/session or token
        tenantId: request.headers.get('x-tenant-id') || undefined,
        actor: request.headers.get('x-actor-id') || undefined,
      };

      const result = await router.dispatch(routeId, payload, context);
      return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Dispatch error:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Internal Server Error'
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
