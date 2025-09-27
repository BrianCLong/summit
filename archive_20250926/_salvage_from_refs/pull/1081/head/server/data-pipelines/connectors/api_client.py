"""
API Connector for IntelGraph
Handles REST API data ingestion with pagination, authentication, and rate limiting
"""

import asyncio
import time
from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import urljoin

import aiohttp

from .base import BaseConnector


class APIConnector(BaseConnector):
    """
    Connector for REST API data sources
    Supports various authentication methods, pagination patterns, and rate limiting
    """

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)

        # API configuration
        self.base_url = config.get("base_url")
        self.endpoint = config.get("endpoint", "")
        self.method = config.get("method", "GET").upper()
        self.headers = config.get("headers", {})
        self.params = config.get("params", {})
        self.timeout = config.get("timeout", 30)

        # Authentication
        self.auth_type = config.get("auth_type")  # bearer, basic, api_key, oauth2
        self.auth_config = config.get("auth", {})

        # Pagination
        self.pagination = config.get("pagination", {})
        self.page_size = self.pagination.get("page_size", 100)
        self.max_pages = self.pagination.get("max_pages")

        # Rate limiting
        self.rate_limit = config.get("rate_limit", {})
        self.requests_per_second = self.rate_limit.get("requests_per_second", 10)
        self.requests_per_minute = self.rate_limit.get("requests_per_minute")

        # Data extraction
        self.data_path = config.get("data_path")  # JSONPath to extract records
        self.record_path = config.get("record_path")  # JSONPath for individual records

        # State tracking
        self._session: aiohttp.ClientSession | None = None
        self._last_request_time = 0
        self._requests_this_minute = 0
        self._minute_window_start = 0

    async def connect(self) -> bool:
        """
        Establish connection to the API
        """
        try:
            # Create HTTP session with appropriate configuration
            connector = aiohttp.TCPConnector(
                limit=10,  # Connection pool size
                ttl_dns_cache=300,  # DNS cache TTL
                use_dns_cache=True,
            )

            timeout = aiohttp.ClientTimeout(total=self.timeout)

            self._session = aiohttp.ClientSession(
                connector=connector, timeout=timeout, headers=self.headers
            )

            # Set up authentication
            await self._setup_authentication()

            # Test connection
            if not await self.test_connection():
                raise Exception("API connection test failed")

            self.logger.info(f"Connected to API: {self.base_url}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to connect to API: {e}")
            return False

    async def disconnect(self) -> None:
        """
        Close API connection
        """
        if self._session:
            await self._session.close()
            self._session = None

    async def test_connection(self) -> bool:
        """
        Test API connection
        """
        try:
            url = urljoin(self.base_url, self.endpoint)

            # Make a simple request to test connectivity
            test_params = self.params.copy()
            if self.pagination.get("type") == "limit_offset":
                test_params[self.pagination.get("limit_param", "limit")] = 1

            await self._rate_limit_wait()

            async with self._session.request(self.method, url, params=test_params) as response:
                return response.status < 400

        except Exception as e:
            self.logger.error(f"API connection test failed: {e}")
            return False

    async def extract_data(self, **kwargs) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data from API with pagination support
        """
        try:
            if self.pagination.get("type") == "cursor":
                async for record in self._extract_with_cursor_pagination(**kwargs):
                    yield record
            elif self.pagination.get("type") == "page":
                async for record in self._extract_with_page_pagination(**kwargs):
                    yield record
            elif self.pagination.get("type") == "limit_offset":
                async for record in self._extract_with_offset_pagination(**kwargs):
                    yield record
            else:
                # Single request without pagination
                async for record in self._extract_single_request(**kwargs):
                    yield record

        except Exception as e:
            self.logger.error(f"API data extraction failed: {e}")
            raise

    async def _extract_single_request(self, **kwargs) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data from a single API request
        """
        url = urljoin(self.base_url, self.endpoint)
        params = {**self.params, **kwargs}

        await self._rate_limit_wait()

        async with self._session.request(self.method, url, params=params) as response:
            if response.status >= 400:
                raise Exception(f"API request failed: {response.status} {response.reason}")

            data = await response.json()

            # Extract records from response
            records = self._extract_records_from_response(data)

            for record in records:
                yield record

    async def _extract_with_cursor_pagination(self, **kwargs) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data using cursor-based pagination
        """
        url = urljoin(self.base_url, self.endpoint)
        params = {**self.params, **kwargs}

        cursor = None
        page_count = 0

        while True:
            # Add cursor to params if available
            if cursor:
                cursor_param = self.pagination.get("cursor_param", "cursor")
                params[cursor_param] = cursor

            # Add page size
            if self.page_size:
                size_param = self.pagination.get("size_param", "size")
                params[size_param] = self.page_size

            await self._rate_limit_wait()

            async with self._session.request(self.method, url, params=params) as response:
                if response.status >= 400:
                    raise Exception(f"API request failed: {response.status} {response.reason}")

                data = await response.json()

                # Extract records
                records = self._extract_records_from_response(data)

                if not records:
                    break

                for record in records:
                    yield record

                # Get next cursor
                cursor = self._extract_next_cursor(data)
                if not cursor:
                    break

                # Check max pages limit
                page_count += 1
                if self.max_pages and page_count >= self.max_pages:
                    self.logger.info(f"Reached max pages limit: {self.max_pages}")
                    break

    async def _extract_with_page_pagination(self, **kwargs) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data using page-based pagination
        """
        url = urljoin(self.base_url, self.endpoint)
        params = {**self.params, **kwargs}

        page = self.pagination.get("start_page", 1)

        while True:
            # Add page parameters
            page_param = self.pagination.get("page_param", "page")
            size_param = self.pagination.get("size_param", "size")

            params[page_param] = page
            if self.page_size:
                params[size_param] = self.page_size

            await self._rate_limit_wait()

            async with self._session.request(self.method, url, params=params) as response:
                if response.status >= 400:
                    raise Exception(f"API request failed: {response.status} {response.reason}")

                data = await response.json()

                # Extract records
                records = self._extract_records_from_response(data)

                if not records:
                    break

                for record in records:
                    yield record

                # Check if this was the last page
                if len(records) < self.page_size:
                    break

                # Check max pages limit
                if self.max_pages and page >= self.max_pages:
                    self.logger.info(f"Reached max pages limit: {self.max_pages}")
                    break

                page += 1

    async def _extract_with_offset_pagination(self, **kwargs) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data using limit/offset pagination
        """
        url = urljoin(self.base_url, self.endpoint)
        params = {**self.params, **kwargs}

        offset = 0
        page_count = 0

        while True:
            # Add pagination parameters
            limit_param = self.pagination.get("limit_param", "limit")
            offset_param = self.pagination.get("offset_param", "offset")

            params[limit_param] = self.page_size
            params[offset_param] = offset

            await self._rate_limit_wait()

            async with self._session.request(self.method, url, params=params) as response:
                if response.status >= 400:
                    raise Exception(f"API request failed: {response.status} {response.reason}")

                data = await response.json()

                # Extract records
                records = self._extract_records_from_response(data)

                if not records:
                    break

                for record in records:
                    yield record

                # Check if this was the last page
                if len(records) < self.page_size:
                    break

                # Update offset
                offset += self.page_size

                # Check max pages limit
                page_count += 1
                if self.max_pages and page_count >= self.max_pages:
                    self.logger.info(f"Reached max pages limit: {self.max_pages}")
                    break

    def _extract_records_from_response(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Extract record list from API response using configured data path
        """
        if not self.data_path:
            # If no data path specified, assume the entire response is the records
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # Try common field names for data arrays
                for field in ["data", "results", "items", "records"]:
                    if field in data and isinstance(data[field], list):
                        return data[field]
                # If no common field found, wrap the dict in a list
                return [data]
            else:
                return []

        # Use JSONPath or simple dot notation to extract data
        current = data
        for part in self.data_path.split("."):
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return []

        if isinstance(current, list):
            return current
        elif current is not None:
            return [current]
        else:
            return []

    def _extract_next_cursor(self, data: dict[str, Any]) -> str | None:
        """
        Extract next cursor from API response
        """
        cursor_path = self.pagination.get("cursor_path", "next_cursor")

        current = data
        for part in cursor_path.split("."):
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None

        return current if current else None

    async def _setup_authentication(self) -> None:
        """
        Set up authentication for API requests
        """
        if self.auth_type == "bearer":
            token = self.auth_config.get("token")
            if token:
                self._session.headers["Authorization"] = f"Bearer {token}"

        elif self.auth_type == "api_key":
            key = self.auth_config.get("key")
            header_name = self.auth_config.get("header", "X-API-Key")
            if key:
                self._session.headers[header_name] = key

        elif self.auth_type == "basic":
            username = self.auth_config.get("username")
            password = self.auth_config.get("password")
            if username and password:
                import base64

                credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
                self._session.headers["Authorization"] = f"Basic {credentials}"

    async def _rate_limit_wait(self) -> None:
        """
        Implement rate limiting to avoid overwhelming the API
        """
        current_time = time.time()

        # Per-second rate limiting
        if self.requests_per_second:
            time_since_last = current_time - self._last_request_time
            min_interval = 1.0 / self.requests_per_second

            if time_since_last < min_interval:
                wait_time = min_interval - time_since_last
                await asyncio.sleep(wait_time)

        # Per-minute rate limiting
        if self.requests_per_minute:
            # Reset counter if a new minute has started
            if current_time - self._minute_window_start > 60:
                self._requests_this_minute = 0
                self._minute_window_start = current_time

            # Wait if we've hit the per-minute limit
            if self._requests_this_minute >= self.requests_per_minute:
                wait_time = 60 - (current_time - self._minute_window_start)
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                    self._requests_this_minute = 0
                    self._minute_window_start = time.time()

            self._requests_this_minute += 1

        self._last_request_time = time.time()

    async def get_metadata(self) -> dict[str, Any]:
        """
        Get metadata about the API source
        """
        metadata = {
            "connector_type": "api",
            "base_url": self.base_url,
            "endpoint": self.endpoint,
            "method": self.method,
            "auth_type": self.auth_type,
            "pagination": self.pagination,
            "rate_limit": self.rate_limit,
        }

        try:
            # Try to get API metadata if available
            if await self.test_connection():
                metadata["status"] = "accessible"

                # Some APIs provide metadata endpoints
                if hasattr(self, "metadata_endpoint"):
                    url = urljoin(self.base_url, self.metadata_endpoint)
                    async with self._session.get(url) as response:
                        if response.status == 200:
                            api_metadata = await response.json()
                            metadata["api_info"] = api_metadata
            else:
                metadata["status"] = "inaccessible"

        except Exception as e:
            metadata["status"] = "error"
            metadata["error"] = str(e)

        return metadata
