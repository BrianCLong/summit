import os

from .config import CopilotMetricsConfig


class CopilotMetricsClient:
    def __init__(self, cfg: CopilotMetricsConfig):
        self.cfg = cfg

    def _token(self) -> str:
        token = os.getenv("GITHUB_TOKEN", "")
        if not token:
            raise RuntimeError("Missing GITHUB_TOKEN")
        return token

    def _headers(self) -> dict:
        return {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self._token()}",
            "X-GitHub-Api-Version": self.cfg.api_version,
        }

    def _ensure_enabled(self) -> None:
        if not self.cfg.enabled:
            raise RuntimeError(
                "Copilot metrics connector disabled (deny-by-default)."
            )

    def get_enterprise_report_links_for_day(self, enterprise: str, day: str) -> dict:
        """
        Uses GitHub REST: GET /enterprises/{enterprise}/copilot/metrics/reports/enterprise-1-day?day=YYYY-MM-DD
        Do NOT persist signed URLs returned in `download_links`.
        """
        self._ensure_enabled()

        url = (
            f"{self.cfg.api_base_url}/enterprises/{enterprise}"
            "/copilot/metrics/reports/enterprise-1-day"
        )
        import requests

        response = requests.get(
            url,
            headers=self._headers(),
            params={"day": day},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
