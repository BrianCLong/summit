/**
 * Centralized system messages with stable IDs
 * These messages are used for errors, refusals, and guardrails
 * and should be localized via the i18n system
 */

export enum MessageId {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'auth.error.invalid_credentials',
  AUTH_SESSION_EXPIRED = 'auth.error.session_expired',
  AUTH_UNAUTHORIZED = 'auth.error.unauthorized',
  AUTH_FORBIDDEN = 'auth.error.forbidden',

  // Validation errors
  VALIDATION_REQUIRED_FIELD = 'validation.error.required_field',
  VALIDATION_INVALID_FORMAT = 'validation.error.invalid_format',
  VALIDATION_TOO_LONG = 'validation.error.too_long',
  VALIDATION_TOO_SHORT = 'validation.error.too_short',

  // API errors
  API_NOT_FOUND = 'api.error.not_found',
  API_SERVER_ERROR = 'api.error.server_error',
  API_RATE_LIMIT = 'api.error.rate_limit',
  API_TIMEOUT = 'api.error.timeout',

  // Data errors
  DATA_ALREADY_EXISTS = 'data.error.already_exists',
  DATA_NOT_FOUND = 'data.error.not_found',
  DATA_INVALID_STATE = 'data.error.invalid_state',

  // Copilot messages
  COPILOT_REFUSAL_HARMFUL = 'copilot.refusal.harmful_content',
  COPILOT_REFUSAL_PRIVATE = 'copilot.refusal.private_info',
  COPILOT_REFUSAL_POLICY = 'copilot.refusal.policy_violation',
  COPILOT_GUARDRAIL_CLASSIFICATION = 'copilot.guardrail.classification',
  COPILOT_GUARDRAIL_SENSITIVE = 'copilot.guardrail.sensitive_content',

  // Translation errors
  TRANSLATION_NOT_ALLOWED = 'translation.error.not_allowed',
  TRANSLATION_POLICY_VIOLATION = 'translation.error.policy_violation',
  TRANSLATION_FAILED = 'translation.error.failed',
  TRANSLATION_LANGUAGE_UNSUPPORTED = 'translation.error.language_unsupported',

  // Success messages
  SUCCESS_SAVED = 'success.saved',
  SUCCESS_DELETED = 'success.deleted',
  SUCCESS_UPDATED = 'success.updated',
  SUCCESS_CREATED = 'success.created',

  // Info messages
  INFO_LOADING = 'info.loading',
  INFO_PROCESSING = 'info.processing',
  INFO_NO_DATA = 'info.no_data',
  INFO_NO_RESULTS = 'info.no_results',
}

/**
 * Default English messages (fallback)
 */
export const DEFAULT_MESSAGES: Record<MessageId, string> = {
  // Authentication
  [MessageId.AUTH_INVALID_CREDENTIALS]:
    'Invalid username or password',
  [MessageId.AUTH_SESSION_EXPIRED]:
    'Your session has expired. Please sign in again.',
  [MessageId.AUTH_UNAUTHORIZED]:
    'You are not authorized to access this resource',
  [MessageId.AUTH_FORBIDDEN]:
    'Access forbidden. You do not have permission to perform this action.',

  // Validation
  [MessageId.VALIDATION_REQUIRED_FIELD]: 'This field is required',
  [MessageId.VALIDATION_INVALID_FORMAT]: 'Invalid format',
  [MessageId.VALIDATION_TOO_LONG]: 'Value is too long',
  [MessageId.VALIDATION_TOO_SHORT]: 'Value is too short',

  // API
  [MessageId.API_NOT_FOUND]: 'Resource not found',
  [MessageId.API_SERVER_ERROR]: 'An error occurred. Please try again later.',
  [MessageId.API_RATE_LIMIT]: 'Too many requests. Please try again later.',
  [MessageId.API_TIMEOUT]: 'Request timed out. Please try again.',

  // Data
  [MessageId.DATA_ALREADY_EXISTS]: 'This item already exists',
  [MessageId.DATA_NOT_FOUND]: 'Item not found',
  [MessageId.DATA_INVALID_STATE]: 'Invalid state for this operation',

  // Copilot
  [MessageId.COPILOT_REFUSAL_HARMFUL]:
    'I cannot provide assistance with harmful or dangerous content.',
  [MessageId.COPILOT_REFUSAL_PRIVATE]:
    'I cannot access or share private information.',
  [MessageId.COPILOT_REFUSAL_POLICY]:
    'This request violates our usage policies.',
  [MessageId.COPILOT_GUARDRAIL_CLASSIFICATION]:
    'This content contains classified information and requires proper clearance.',
  [MessageId.COPILOT_GUARDRAIL_SENSITIVE]:
    'This content contains sensitive information. Please ensure proper handling.',

  // Translation
  [MessageId.TRANSLATION_NOT_ALLOWED]:
    'Translation is not allowed for this content',
  [MessageId.TRANSLATION_POLICY_VIOLATION]:
    'Translation violates policy constraints',
  [MessageId.TRANSLATION_FAILED]: 'Translation failed. Please try again.',
  [MessageId.TRANSLATION_LANGUAGE_UNSUPPORTED]:
    'The requested language is not supported',

  // Success
  [MessageId.SUCCESS_SAVED]: 'Successfully saved',
  [MessageId.SUCCESS_DELETED]: 'Successfully deleted',
  [MessageId.SUCCESS_UPDATED]: 'Successfully updated',
  [MessageId.SUCCESS_CREATED]: 'Successfully created',

  // Info
  [MessageId.INFO_LOADING]: 'Loading...',
  [MessageId.INFO_PROCESSING]: 'Processing...',
  [MessageId.INFO_NO_DATA]: 'No data available',
  [MessageId.INFO_NO_RESULTS]: 'No results found',
};

/**
 * Get system message by ID
 * This should be used with the i18n system in production
 */
export function getSystemMessage(
  messageId: MessageId,
  params?: Record<string, string | number>
): string {
  let message = DEFAULT_MESSAGES[messageId] || messageId;

  // Simple parameter substitution
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });
  }

  return message;
}

/**
 * Create error with message ID
 */
export class SystemError extends Error {
  constructor(
    public messageId: MessageId,
    public params?: Record<string, string | number>,
    public code?: string
  ) {
    super(getSystemMessage(messageId, params));
    this.name = 'SystemError';
  }
}
