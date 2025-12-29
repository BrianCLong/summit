export type ErrorCodeDescriptor = {
  code: string;
  httpStatus: number;
  message: string;
  remediation: string;
};

export const ERROR_CODES = {
  receipts: {
    signingSecretMissing: {
      code: 'RCPT_SIGNING_SECRET_MISSING',
      httpStatus: 500,
      message: 'EVIDENCE_SIGNING_SECRET is required to sign receipts',
      remediation:
        'Provide EVIDENCE_SIGNING_SECRET (and optional EVIDENCE_SIGNER_KID) in the runtime environment and redeploy.',
    },
  },
  plugins: {
    exportJsonMissing: {
      code: 'PLUGIN_EXPORT_JSON_MISSING',
      httpStatus: 400,
      message: 'missing export_json()',
      remediation:
        'Ensure WASM plugins export export_json(input_json_string) and return a pointer to a NUL-terminated JSON payload.',
    },
    wasmTimeout: {
      code: 'PLUGIN_WASM_TIMEOUT',
      httpStatus: 504,
      message: 'wasm timeout',
      remediation:
        'Increase WASM_MAX_CPU_MS for long-running plugins or reduce the workload so execution completes before the guard timer.',
    },
    wasmOom: {
      code: 'PLUGIN_WASM_OOM',
      httpStatus: 503,
      message: 'wasm OOM',
      remediation:
        'Reduce plugin input size or raise WASM_MAX_MEM_MB; confirm the module frees memory after heavy allocations.',
    },
  },
  compliance: {
    controlMapMissing: {
      code: 'COMPLIANCE_CONTROL_MAP_MISSING',
      httpStatus: 500,
      message: 'CRITICAL: Control map not found at <path>',
      remediation:
        'Restore compliance/control-map.yaml from source control and rerun the drift check before deployment.',
    },
    artifactMissing: {
      code: 'COMPLIANCE_ARTIFACT_MISSING',
      httpStatus: 422,
      message: '[DRIFT] Mapped artifact not found: <artifact>',
      remediation:
        'Update compliance/control-map.yaml to point to an existing artifact or recreate the missing evidence file.',
    },
  },
  authz: {
    authenticationRequired: {
      code: 'AUTHZ_AUTHENTICATION_REQUIRED',
      httpStatus: 401,
      message: 'Authentication required',
      remediation: 'Provide a valid session or token in the GraphQL request context before retrying.',
    },
    policyDenied: {
      code: 'AUTHZ_POLICY_DENIED',
      httpStatus: 403,
      message: 'Access denied to <field>: <reason>',
      remediation:
        'Review the OPA decision, adjust tenant/mission tags if appropriate, or request a temporary policy exception.',
    },
    engineUnavailable: {
      code: 'AUTHZ_ENGINE_UNAVAILABLE',
      httpStatus: 503,
      message: 'Policy engine unavailable',
      remediation:
        'Restore OPA availability and connectivity; confirm OPA_ENABLED and the configured URL are correct before retrying.',
    },
    policyEvaluationFailed: {
      code: 'AUTHZ_POLICY_EVALUATION_FAILED',
      httpStatus: 403,
      message: 'Authorization check failed',
      remediation:
        'Inspect server logs for upstream errors or malformed OPA responses, then retry after addressing the underlying cause.',
    },
  },
} as const satisfies Record<string, Record<string, ErrorCodeDescriptor>>;

export function withSupportCode<T extends Error>(error: T, code: string) {
  (error as Error & { code: string }).code = code;
  return error;
}
