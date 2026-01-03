import type { ToolPermissionDefinition } from '../types.js';

export const defaultToolPermissions: ToolPermissionDefinition[] = [
  {
    name: 'safe_retrieval',
    description: 'Reads previously indexed content within tenant scope',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 20 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    minPrivilege: 'low',
    allowedRoutes: ['/llm/rag', '/llm/query'],
    allowedRoles: ['analyst', 'admin'],
  },
  {
    name: 'summarize_text',
    description: 'Summarizes user-provided passages only',
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', minLength: 1, maxLength: 5000 },
      },
      required: ['text'],
      additionalProperties: false,
    },
    minPrivilege: 'medium',
    allowedRoutes: ['/llm/summarize'],
    allowedRoles: ['analyst', 'admin', 'viewer'],
  },
  {
    name: 'write_audit_note',
    description: 'Writes a read-only audit note that requires elevated assurance',
    schema: {
      type: 'object',
      properties: {
        note: { type: 'string', minLength: 1, maxLength: 1000 },
        caseId: { type: 'string', minLength: 1 },
      },
      required: ['note', 'caseId'],
      additionalProperties: false,
    },
    minPrivilege: 'high',
    allowedRoutes: ['/llm/audit-note'],
    allowedRoles: ['admin'],
    stepUpRequired: true,
    highRisk: true,
  },
  {
    name: 'network_request',
    description: 'Performs network requests; disabled unless explicitly allowed with step-up.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        method: { type: 'string', enum: ['get', 'post'] },
      },
      required: ['url', 'method'],
      additionalProperties: false,
    },
    minPrivilege: 'critical',
    allowedRoutes: [],
    allowedRoles: [],
    stepUpRequired: true,
    highRisk: true,
  },
];
