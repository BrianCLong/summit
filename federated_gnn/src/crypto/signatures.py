def verify_signature(envelope: dict, party_spec: dict) -> bool:
    """
    Verifies the signature in the update envelope against the party's public key.
    For this implementation, we simulate verification.

    Args:
        envelope: The update envelope dict containing 'signature' and 'party_id'.
        party_spec: The party specification dict containing 'signing_key_id'.

    Returns:
        True if signature is valid, False otherwise.
    """
    signature = envelope.get("signature", "")
    key_id = party_spec.get("signing_key_id", "")

    if not signature or not key_id:
        return False

    # Mock check: signature must start with "sig_{key_id}" to be considered valid
    # TODO: Replace with Ed25519 or similar library for production
    expected_prefix = f"sig_{key_id}"
    return signature.startswith(expected_prefix)
