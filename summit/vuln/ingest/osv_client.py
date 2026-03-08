from typing import Any, Dict, List, Optional

import requests


class OSVClient:
    """Client for interacting with the OSV API (osv.dev)."""

    BASE_URL = "https://api.osv.dev/v1"

    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    def get_vuln_by_id(self, vuln_id: str) -> Optional[dict[str, Any]]:
        """Fetch a single vulnerability by its ID (e.g. GHSA-..., OSV-...)."""
        url = f"{self.BASE_URL}/vulns/{vuln_id}"
        try:
            response = requests.get(url, timeout=self.timeout)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                response.raise_for_status()
        except Exception as e:
            # In a real app, we'd use a logger here
            print(f"Error fetching {vuln_id} from OSV: {e}")
            return None

    def query_by_package(self, package_name: str, ecosystem: str, version: Optional[str] = None) -> list[dict[str, Any]]:
        """Query vulnerabilities for a specific package."""
        url = f"{self.BASE_URL}/query"
        payload = {
            "package": {
                "name": package_name,
                "ecosystem": ecosystem
            }
        }
        if version:
            payload["version"] = version

        try:
            response = requests.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return data.get("vulns", [])
        except Exception as e:
            print(f"Error querying package {package_name} from OSV: {e}")
            return []
