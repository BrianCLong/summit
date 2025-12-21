import jwt from 'jsonwebtoken';

export type Claims = { sub: string; roles: string[]; tenant?: string };

export function verifyJwt(token: string) {
  const pub = process.env.OIDC_JWKS_PEM!; // for demo: PEM string; prod: JWKS fetch + cache
  return jwt.verify(token, pub, {
    algorithms: ['RS256'],
    audience: process.env.OIDC_AUD,
    issuer: process.env.OIDC_ISS,
  }) as Claims;
}

export function requireRole(role: string) {
  return function requireRoleMiddleware(req: any, res: any, next: any) {
    try {
      const raw = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const claims = verifyJwt(raw);
      if (!claims.roles?.includes(role)) {
        return res.status(403).json({ error: 'forbidden' });
      }
      req.user = claims;
      next();
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

export function authenticate() {
  return function authenticateMiddleware(req: any, res: any, next: any) {
    const raw = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!raw) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    try {
      req.user = verifyJwt(raw);
      next();
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

export function csrfGuard() {
  return function csrfMiddleware(req: any, res: any, next: any) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const token = req.headers['x-csrf-token'];
      if (!token || token !== process.env.CSRF_TOKEN) {
        return res.status(419).json({ error: 'csrf' });
      }
    }
    next();
  };
}
