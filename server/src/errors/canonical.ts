import { AppError, ErrorCategory, ErrorSeverity } from './ErrorHandlingFramework.js';
import { MasterErrorCatalog, ErrorKey } from './catalog.js';

export class CanonicalError extends AppError {
  public readonly remediation: string;

  constructor(key: ErrorKey, details?: Record<string, unknown>) {
    const def = MasterErrorCatalog[key];

    let category = ErrorCategory.OPERATIONAL;
    if (def.category === 'System') category = ErrorCategory.PROGRAMMING;
    if (def.category === 'Security') category = ErrorCategory.SECURITY;

    super(def.message, def.code as any, {
      statusCode: def.status,
      category,
      severity: def.status >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
      context: { metadata: details }
    });

    this.remediation = def.remediation;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      remediation: this.remediation
    };
  }
}
