/**
 * WebAuthn Step-Up Authentication Middleware
 *
 * Enforces step-up authentication for risky routes using WebAuthn.
 * Integrates with OPA policies and emits audit events.
 */

const { OPAClient } = require('../services/opa-client');
const { AuditLogger } = require('../services/audit-logger');
const { WebAuthnService } = require('../services/webauthn');

class WebAuthnStepUpMiddleware {
  constructor() {
    this.opa = new OPAClient();
    this.audit = new AuditLogger();
    this.webauthn = new WebAuthnService();
  }

  /**
   * Middleware handler for step-up authentication
   */
  async handle(req, res, next) {
    try {
      // Extract step-up auth from request
      const stepupAuth = this.extractStepUpAuth(req);

      // Build OPA input
      const opaInput = {
        request: {
          path: req.path,
          method: req.method,
          body: req.body,
        },
        user: {
          id: req.user?.id,
          email: req.user?.email,
        },
        stepup_auth: stepupAuth,
      };

      // Evaluate OPA policy
      const decision = await this.opa.evaluate('webauthn_stepup', opaInput);

      // If allowed, emit audit evidence and proceed
      if (decision.allow) {
        if (decision.audit_evidence) {
          await this.audit.emit(decision.audit_evidence);
        }
        return next();
      }

      // If denied, emit audit evidence and return error
      if (decision.audit_evidence) {
        await this.audit.emit(decision.audit_evidence);
      }

      // Return denial with explanation
      return res.status(403).json({
        error: 'Forbidden',
        message: decision.denial_reason?.reason || 'Step-up authentication required',
        required_action: decision.denial_reason?.required_action,
        help: decision.denial_reason?.help,
        route: req.path,
      });

    } catch (error) {
      console.error('WebAuthn step-up middleware error:', error);

      // Fail-closed: deny on error
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Unable to verify authentication requirements',
      });
    }
  }

  /**
   * Extract step-up authentication from request headers
   */
  extractStepUpAuth(req) {
    const stepupHeader = req.headers['x-stepup-auth'];

    if (!stepupHeader) {
      return {
        present: false,
        verified: false,
      };
    }

    try {
      // Decode and verify step-up auth token
      const stepupData = JSON.parse(
        Buffer.from(stepupHeader, 'base64').toString('utf-8')
      );

      // Verify WebAuthn assertion
      const verified = this.webauthn.verifyAssertion(
        stepupData.credential_id,
        stepupData.authenticator_data,
        stepupData.client_data_json,
        stepupData.signature
      );

      return {
        present: true,
        verified,
        timestamp: stepupData.timestamp,
        credential_id: stepupData.credential_id,
        authenticator_data: stepupData.authenticator_data,
        attestation_reference: stepupData.attestation_reference,
      };

    } catch (error) {
      console.error('Failed to parse step-up auth:', error);
      return {
        present: true,
        verified: false,
      };
    }
  }
}

// Export middleware instance
const middleware = new WebAuthnStepUpMiddleware();

module.exports = {
  webauthnStepUp: (req, res, next) => middleware.handle(req, res, next),
  WebAuthnStepUpMiddleware,
};
