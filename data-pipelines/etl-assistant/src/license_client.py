"""License registry client for compliance checking.

Communicates with the license-registry service to verify source compliance.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


@dataclass
class LicenseCheckResult:
    """Result from license compliance check."""
    compliance_status: str  # allow, warn, block
    reason: str
    violations: list[dict[str, Any]]
    warnings: list[dict[str, Any]]
    appeal_path: str | None


class LicenseClient:
    """Client for license-registry service."""

    def __init__(self, base_url: str | None = None, authority_id: str | None = None):
        """Initialize license client.

        Args:
            base_url: License registry service URL
            authority_id: Authority identifier for policy enforcement
        """
        self.base_url = base_url or os.environ.get(
            "LICENSE_REGISTRY_URL", "http://localhost:4030"
        )
        self.authority_id = authority_id or os.environ.get(
            "AUTHORITY_ID", "etl-assistant"
        )

        if not HTTPX_AVAILABLE:
            raise RuntimeError(
                "httpx library required for license client. "
                "Install with: pip install httpx"
            )

    async def check_compliance(
        self,
        source_name: str,
        data_source_ids: list[str],
        operation: str = "ingest",
        purpose: str = "intelligence",
    ) -> LicenseCheckResult:
        """Check license compliance for a data source.

        Args:
            source_name: Name of the data source
            data_source_ids: List of data source IDs to check
            operation: Type of operation (ingest, query, export, transform)
            purpose: Purpose of the operation

        Returns:
            LicenseCheckResult with compliance decision
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/compliance/check",
                json={
                    "operation": operation,
                    "data_source_ids": data_source_ids,
                    "purpose": purpose,
                },
                headers={
                    "x-authority-id": self.authority_id,
                    "x-reason-for-access": f"ETL ingest for {source_name}",
                },
            )

            if response.status_code == 403:
                return LicenseCheckResult(
                    compliance_status="block",
                    reason="Policy denial - missing authority binding",
                    violations=[
                        {
                            "source": source_name,
                            "violation": "Policy enforcement failed",
                            "severity": "critical",
                        }
                    ],
                    warnings=[],
                    appeal_path="/ombudsman/appeals",
                )

            if response.status_code != 200:
                return LicenseCheckResult(
                    compliance_status="warn",
                    reason=f"License check failed: {response.status_code}",
                    violations=[],
                    warnings=[
                        {
                            "source": source_name,
                            "warning": "Could not verify license",
                            "severity": "medium",
                        }
                    ],
                    appeal_path=None,
                )

            data = response.json()
            return LicenseCheckResult(
                compliance_status=data.get("compliance_status", "unknown"),
                reason=data.get("human_readable_reason", ""),
                violations=data.get("violations", []),
                warnings=data.get("warnings", []),
                appeal_path=data.get("appeal_path"),
            )

    async def register_source(
        self,
        name: str,
        source_type: str,
        license_id: str,
        pii_classification: str = "medium",
        retention_period: int = 365,
    ) -> dict[str, Any]:
        """Register a new data source with the license registry.

        Args:
            name: Source name
            source_type: Type of source
            license_id: Associated license ID
            pii_classification: PII risk level
            retention_period: Retention period in days

        Returns:
            Registered data source information
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/data-sources",
                json={
                    "name": name,
                    "source_type": source_type,
                    "license_id": license_id,
                    "tos_accepted": True,
                    "dpia_completed": False,
                    "pii_classification": pii_classification,
                    "retention_period": retention_period,
                    "geographic_restrictions": [],
                },
                headers={
                    "x-authority-id": self.authority_id,
                    "x-reason-for-access": f"Register source {name}",
                },
            )

            response.raise_for_status()
            return response.json()

    def check_compliance_sync(
        self,
        source_name: str,
        data_source_ids: list[str],
        operation: str = "ingest",
        purpose: str = "intelligence",
    ) -> LicenseCheckResult:
        """Synchronous version of check_compliance.

        For backward compatibility with non-async code.
        """
        import asyncio

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(
            self.check_compliance(source_name, data_source_ids, operation, purpose)
        )
