def require_consent(consent_proof: str | None) -> None:
    """
    Enforces the consent policy for voice cloning.
    Fails if a valid consent_proof is not provided.
    """
    if not consent_proof:
        raise PermissionError("voice_clone requires consent.proof. Access denied.")

    # In a real implementation, this would validate the token/attestation.
    # Supported versions might include "I_HAVE_RIGHTS_ATTESTATION_V1".
    if consent_proof not in ["I_HAVE_RIGHTS_ATTESTATION_V1"]:
        raise PermissionError(f"Invalid or unsupported consent.proof: {consent_proof}")
