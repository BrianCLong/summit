import os
import time
from typing import Optional
import httpx

class AzureAuthProvider:
    def __init__(self, tenant_id: Optional[str] = None, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.tenant_id = tenant_id or os.environ.get("AZURE_TENANT_ID")
        self.client_id = client_id or os.environ.get("AZURE_CLIENT_ID")
        self.client_secret = client_secret or os.environ.get("AZURE_CLIENT_SECRET")
        self._token = None
        self._expires_at = 0

    def get_token(self) -> str:
        """
        Returns a valid access token.
        Uses Client Secret flow via raw HTTP requests to avoid extra dependencies.
        """
        if self._token and time.time() < self._expires_at:
            return self._token

        if not (self.tenant_id and self.client_id and self.client_secret):
            # For testing purposes without credentials, we allow checking if we are in a mock/test mode?
            # Or simpler: just raise error and ensure tests provide mock values or mock the method.
            raise ValueError("Azure credentials (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET) not set.")

        return self._fetch_token_http()

    def _fetch_token_http(self) -> str:
        url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://cognitiveservices.azure.com/.default"
        }

        with httpx.Client() as client:
            resp = client.post(url, data=data, timeout=10.0)
            resp.raise_for_status()
            js = resp.json()
            self._token = js["access_token"]
            self._expires_at = time.time() + js.get("expires_in", 3600) - 60 # buffer
            return self._token
