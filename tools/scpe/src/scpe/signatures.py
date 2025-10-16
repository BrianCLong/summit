"""Signature verification utilities."""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import load_pem_public_key

from .config import resolve_path
from .errors import ConfigError, VerificationError


def verify_signature(
    artifact_name: str,
    signature_spec: dict[str, Any],
    payload: bytes,
    *,
    base_path: Path,
) -> None:
    """Verify an artifact signature according to the spec."""

    if not signature_spec:
        raise ConfigError(f"Artifact '{artifact_name}' is missing a signature specification")

    sig_type = signature_spec.get("type")
    if sig_type == "ed25519":
        public_key_bytes, key_format = _load_public_key(signature_spec.get("public_key"), base_path)
        signature_bytes = _load_signature_bytes(
            signature_spec, base_path, default_encoding="base64"
        )
        _verify_ed25519(artifact_name, public_key_bytes, key_format, signature_bytes, payload)
    elif sig_type == "hmac-sha256":
        signature_bytes = _load_signature_bytes(
            signature_spec, base_path, default_encoding="base64"
        )
        secret_bytes = _load_secret(signature_spec, base_path)
        expected = hmac.new(secret_bytes, payload, hashlib.sha256).digest()
        if not hmac.compare_digest(signature_bytes, expected):
            raise VerificationError(
                f"HMAC signature mismatch for artifact '{artifact_name}'",
                hint="Ensure the shared secret matches the signing environment",
            )
    else:
        raise ConfigError(f"Unsupported signature type '{sig_type}' for artifact '{artifact_name}'")


def _verify_ed25519(
    artifact_name: str,
    public_key_bytes: bytes,
    key_format: str,
    signature_bytes: bytes,
    payload: bytes,
) -> None:
    try:
        if key_format == "pem":
            key = load_pem_public_key(public_key_bytes)
            if not isinstance(key, Ed25519PublicKey):
                raise ConfigError(
                    f"Public key for artifact '{artifact_name}' is not an Ed25519 key",
                    hint="Ensure the PEM file encodes an Ed25519 public key",
                )
        elif key_format == "raw":
            key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        else:
            raise ConfigError(
                f"Unsupported public key format '{key_format}' for artifact '{artifact_name}'"
            )

        key.verify(signature_bytes, payload)
    except InvalidSignature as exc:
        raise VerificationError(
            f"Invalid Ed25519 signature for artifact '{artifact_name}'",
            hint="Confirm the artifact digest and signature were generated from the same bytes",
        ) from exc


def _load_public_key(public_key_spec: Any, base_path: Path) -> tuple[bytes, str]:
    if public_key_spec is None:
        raise ConfigError("Signature specification must provide a public key")

    if isinstance(public_key_spec, str):
        return _decode_bytes(public_key_spec, "base64"), "raw"

    if isinstance(public_key_spec, dict):
        fmt = public_key_spec.get("format", "pem").lower()
        if "path" in public_key_spec:
            key_path = resolve_path(base_path, public_key_spec["path"])
            data = key_path.read_bytes()
            return data, fmt
        if "value" in public_key_spec:
            value = public_key_spec["value"]
            if isinstance(value, str):
                encoding = public_key_spec.get("encoding", "base64")
                data = _decode_bytes(value, encoding if fmt != "pem" else "utf-8")
            elif isinstance(value, bytes):
                data = value
            else:
                raise ConfigError("Unsupported public key value type")
            if fmt == "pem" and isinstance(data, str):
                data = data.encode("utf-8")
            return data if isinstance(data, bytes) else data.encode("utf-8"), fmt

    raise ConfigError("Unable to load public key from signature specification")


def _load_secret(signature_spec: dict[str, Any], base_path: Path) -> bytes:
    secret_spec = signature_spec.get("secret")
    if secret_spec is None:
        raise ConfigError("HMAC signature requires a secret specification")

    if isinstance(secret_spec, dict):
        if "env" in secret_spec:
            import os

            env_value = os.getenv(secret_spec["env"])
            if env_value is None:
                raise ConfigError(
                    f"Environment variable '{secret_spec['env']}' is not set for HMAC secret",
                    hint="Expose the secret to the CI job before running SCPE",
                )
            return _decode_bytes(env_value, secret_spec.get("encoding", "base64"))
        if "path" in secret_spec:
            secret_path = resolve_path(base_path, secret_spec["path"])
            data = secret_path.read_bytes()
            encoding = secret_spec.get("encoding", "base64")
            return _decode_bytes(data.decode("utf-8") if encoding != "binary" else data, encoding)
        if "value" in secret_spec:
            value = secret_spec["value"]
            encoding = secret_spec.get("encoding", "base64")
            return _decode_bytes(value, encoding)

    raise ConfigError("Unsupported secret specification for HMAC signature")


def _load_signature_bytes(
    signature_spec: dict[str, Any],
    base_path: Path,
    *,
    default_encoding: str,
) -> bytes:
    encoding = signature_spec.get("encoding", default_encoding)
    if "value" in signature_spec:
        return _decode_bytes(signature_spec["value"], encoding)
    if "path" in signature_spec:
        sig_path = resolve_path(base_path, signature_spec["path"])
        data = sig_path.read_bytes()
        if encoding == "binary":
            return data
        return _decode_bytes(data.decode("utf-8"), encoding)
    raise ConfigError("Signature specification must provide a value or a path")


def _decode_bytes(value: Any, encoding: str) -> bytes:
    if isinstance(value, bytes) and encoding == "binary":
        return value
    if isinstance(value, bytes):
        value = value.decode("utf-8")

    if not isinstance(value, str):
        raise ConfigError("Signature values must be text or bytes")

    normalized = encoding.lower()
    text_value = value.strip() if normalized in {"base64", "hex"} else value
    if normalized == "base64":
        try:
            return base64.b64decode(text_value, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ConfigError("Invalid base64 value in signature specification") from exc
    if normalized == "hex":
        return bytes.fromhex(text_value)
    if normalized in {"utf-8", "utf8", "text"}:
        return value.encode("utf-8")
    if normalized == "binary":
        return value.encode("utf-8")

    raise ConfigError(f"Unsupported encoding '{encoding}' for signature specification")
