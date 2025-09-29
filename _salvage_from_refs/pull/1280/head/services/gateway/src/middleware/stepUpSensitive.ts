import { GraphQLFieldResolver } from 'graphql';
import { Request, Response } from 'express';

export function stepUpSensitive(): GraphQLFieldResolver<any, { req: Request; res: Response }>{
  return async (source, args, ctx, info) => {
    const field = info.parentType.getFields()[info.fieldName];
    const hasDirective = field?.astNode?.directives?.some(d => d.name.value === 'sensitive');
    if (!hasDirective) return (field.resolve as any)?.(source, args, ctx, info);

    const assert = ctx.req.header('X-StepUp-Assert');
    if (!assert) {
      throw new Error('Step-up required: missing WebAuthn assertion');
    }
    ctx.req.audit?.record?.({
      event: 'stepup.assertion',
      challengeId: ctx.req.header('X-StepUp-Challenge') ?? 'unknown',
    });
    return (field.resolve as any)?.(source, args, ctx, info);
  };
}
