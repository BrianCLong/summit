import { classifyIntent } from '../../../agents/policies/intentClassifier.js';
import { isRedline } from '../../../agents/policies/redlines.js';
import { emitAuditLog, AuditLogEntry } from '../../../agents/policies/auditEmitter.js';
import { InferenceProfile, isAllowedUse } from '../../../agents/policies/allowedUseMatrix.js';
import { GraphQLError } from 'graphql';

interface GraphQLContext {
  userId: string;
  requestId: string;
  profile: InferenceProfile;
}

export const graphqlPolicyGuard = async (resolve: any, parent: any, args: any, context: GraphQLContext, info: any) => {
  const prompt = args.input?.prompt || args.prompt;
  const { userId = 'anonymous', requestId = 'unknown', profile = 'civilian_safe' } = context;
  if (!prompt) return resolve(parent, args, context, info);
  try {
      const classification = await classifyIntent(prompt);
      const auditEntry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          userId,
          requestId,
          action: `graphql_mutation_${info.fieldName}`,
          intentClassification: classification,
          details: { profile, fieldName: info.fieldName, prompt: prompt.substring(0, 100) + '...' },
          status: 'allowed'
      };
      if (isRedline(classification.intent) || classification.isRedline) {
          auditEntry.status = 'denied';
          emitAuditLog(auditEntry);
          throw new GraphQLError('Request denied due to policy violation (redline).', { extensions: { code: 'FORBIDDEN_REDLINE' } });
      }
      if (!isAllowedUse(profile, classification.intent) && classification.intent !== 'general_inquiry') {
          auditEntry.status = 'flagged';
          emitAuditLog(auditEntry);
          throw new GraphQLError('Request denied: intent not permitted for the current inference profile.', { extensions: { code: 'FORBIDDEN_PROFILE' } });
      }
      auditEntry.status = 'allowed';
      emitAuditLog(auditEntry);
      return resolve(parent, args, context, info);
  } catch (error) {
      if (error instanceof GraphQLError) throw error;
      console.error("Policy enforcement error:", error);
      throw new GraphQLError('Internal server error during policy check.', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
  }
};
