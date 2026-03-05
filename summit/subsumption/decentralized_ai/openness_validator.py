"""Openness and composability checks for decentralized AI projects."""

from __future__ import annotations

from typing import Any

REQUIRED_STANDARDS = ["OpenAPI", "SPDX", "OCI", "ONNX"]


def validate_openness(bundle: dict[str, Any]) -> list[dict[str, str]]:
    """Return deterministic openness findings sorted by check id."""
    checks = [
        ("model-license", bool(bundle.get("model_license")), "Model license declared"),
        ("data-policy", bool(bundle.get("data_access_policy")), "Data access policy documented"),
        ("public-api", bool(bundle.get("public_api_spec")), "Public API spec available"),
        (
            "interop-standards",
            all(std in bundle.get("standards", []) for std in REQUIRED_STANDARDS),
            "Open standards mapped",
        ),
    ]
    findings = [
        {
            "id": check_id,
            "title": title,
            "status": "pass" if passed else "fail",
        }
        for check_id, passed, title in checks
    ]
    return sorted(findings, key=lambda item: item["id"])
