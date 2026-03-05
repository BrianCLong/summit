import { NextFunction, Request, Response } from 'express';

const isConsoleEnabled = () =>
  (process.env.COMMAND_CONSOLE_ENABLED ?? 'true').toLowerCase() !== 'false';

const internalRoles = new Set(['admin', 'system.internal', 'ops', 'platform-admin']);

function hasAdminRole(req: Request): boolean {
  const roles: string[] = [];
  const user = (req as any).user;

  // Rely exclusively on authenticated user object, never on untrusted headers
  if (user?.role) {
    roles.push(user.role);
  }
  if (Array.isArray(user?.roles)) {
    roles.push(...user.roles);
  }

  return roles.some((role) => internalRoles.has(role));
}

export function requireInternalAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isConsoleEnabled()) {
    return res.status(404).json({
      error: 'command_console_disabled',
      message: 'Internal command console is disabled by configuration',
    });
  }

  const configuredToken = process.env.COMMAND_CONSOLE_TOKEN;
  const incomingToken = req.headers['x-internal-token'];
  const tokenMatches =
    configuredToken && typeof incomingToken === 'string'
      ? incomingToken === configuredToken
      : false;

  if (hasAdminRole(req) || tokenMatches) {
    return next();
  }

  // Allow explicit readonly mode for local development
  if (
    !configuredToken &&
    process.env.NODE_ENV !== 'production' &&
    process.env.COMMAND_CONSOLE_READONLY === 'true'
  ) {
    return next();
  }

  return res.status(403).json({
    error: 'forbidden',
    message:
      'Command console routes require admin role or matching X-Internal-Token header',
  });
}
