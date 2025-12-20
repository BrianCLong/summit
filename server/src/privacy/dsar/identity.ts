import type {
  DSARRequest,
  IdentityVerification,
  IdentityVerifier,
} from './types';

/**
 * Simple in-memory identity verifier using a map of expected tokens.
 * Suitable for testing or simple setups where tokens are pre-shared.
 */
export class StaticIdentityVerifier implements IdentityVerifier {
  /**
   * Initializes the verifier with a mapping of subject IDs to expected tokens.
   * @param expectedTokens - A record mapping subject IDs to valid token strings.
   */
  constructor(private readonly expectedTokens: Record<string, string>) {}

  /**
   * Verifies the identity of a DSAR requester.
   * Checks if the provided token matches the expected token for the subject ID.
   *
   * @param request - The DSAR request containing identity proof.
   * @returns A promise resolving to the verification result.
   */
  async verify(request: DSARRequest): Promise<IdentityVerification> {
    const expected = this.expectedTokens[request.subjectId];
    const provided = request.identityProof?.token;
    const verified = Boolean(expected && provided && expected === provided);
    return {
      verified,
      reason: verified ? undefined : 'identity token mismatch',
      verifierId: 'static-fixture',
      proofMethod: request.identityProof?.method,
    };
  }
}
