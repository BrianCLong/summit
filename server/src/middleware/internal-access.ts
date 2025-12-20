import { NextFunction, Request, Response } from 'express';

const isConsoleEnabled = () =>
  (process.env.COMMAND_CONSOLE_ENABLED ?? 'true').toLowerCase() !== 'false';

const internalRoles = new Set(['admin', 'system.internal', 'ops', 'platform-admin']);

function hasAdminRole(req: Request): boolean {
  const roleHeader =
    (req.headers['x-user-role'] as string | undefined) ||
    (req.headers['x-role'] as string | undefined);
  const roles: string[] = [];

  if ((req as any).user?.role) {
    roles.push((req as any).user.role);
  }
  if (Array.isArray((req as any).user?.roles)) {
    roles.push(...(req as any).user.roles);
  }
  if (roleHeader) {
    roles.push(roleHeader);
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
