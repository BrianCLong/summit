import type {
  DSARRequest,
  IdentityVerification,
  IdentityVerifier,
} from './types';

export class StaticIdentityVerifier implements IdentityVerifier {
  constructor(private readonly expectedTokens: Record<string, string>) {}

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
