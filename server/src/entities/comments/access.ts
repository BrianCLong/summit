import logger from '../../config/logger.js';

export interface OpaAccessClient {
  checkDataAccess: (
    userId: string,
    tenantId: string,
    resource: string,
    action: string,
  ) => Promise<boolean>;
}

export interface EntityCommentAccessRequest {
  userId: string;
  tenantId: string;
  entityId: string;
  action: 'comment:read' | 'comment:write';
}

export class EntityCommentAccessError extends Error {
  status = 403;
  code = 'access_denied';

  constructor(message: string) {
    super(message);
    this.name = 'EntityCommentAccessError';
  }
}

export function createEntityCommentAuthorizer(opaClient: OpaAccessClient) {
  const authzLogger = logger.child({ name: 'EntityCommentAccess' });

  return async function assertEntityCommentAccess(
    request: EntityCommentAccessRequest,
  ): Promise<void> {
    const allowed = await opaClient.checkDataAccess(
      request.userId,
      request.tenantId,
      'entity_comment',
      request.action,
    );

    authzLogger.info(
      {
        allowed,
        userId: request.userId,
        tenantId: request.tenantId,
        entityId: request.entityId,
        action: request.action,
      },
      'Entity comment access decision evaluated',
    );

    if (!allowed) {
      throw new EntityCommentAccessError(
        `Access denied for action ${request.action}`,
      );
    }
  };
}
