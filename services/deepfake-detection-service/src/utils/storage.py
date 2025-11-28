"""Storage client for fetching media assets."""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class StorageClient:
    def __init__(self, endpoint: str, access_key: str, secret_key: str, bucket: str):
        self.endpoint = endpoint.rstrip("/")
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket = bucket
        logger.info("StorageClient configured for %s (bucket=%s)", self.endpoint, bucket)

    async def download(self, media_url: str) -> bytes:
        """Download media from a URL.

        The implementation uses HTTP fetches for simplicity; S3-style URLs are
        supported by direct GET requests against the configured endpoint.
        """
        url = media_url
        if media_url.startswith("s3://"):
            path = media_url.replace("s3://", "")
            url = f"{self.endpoint}/{path}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content

    async def upload(self, path: str, data: bytes, content_type: Optional[str] = None) -> str:
        # Placeholder upload to keep interface symmetrical
        logger.info("Mock upload to %s (content_type=%s)", path, content_type)
        return f"{self.endpoint}/{self.bucket}/{path.lstrip('/') }"
