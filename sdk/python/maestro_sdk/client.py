import asyncio

import httpx
from maestro_sdk.maestro_orchestration_api_client.client import (
    AuthenticatedClient,
)  # Rename to avoid conflict
from maestro_sdk.maestro_orchestration_api_client.client import Client as GeneratedClient


class MaestroClient:
    def __init__(self, base_url: str, token: str = None, retries: int = 3, delay: float = 0.5):
        self.base_url = base_url
        self.token = token
        self.retries = retries
        self.delay = delay
        self._client = (
            AuthenticatedClient(base_url=base_url, token=token)
            if token
            else GeneratedClient(base_url=base_url)
        )

    async def _request_with_retry(self, method: str, path: str, **kwargs):
        for i in range(self.retries + 1):
            try:
                response = await self._client.get_async_httpx_client().request(
                    method, path, **kwargs
                )
                response.raise_for_status()  # Raise an exception for 4xx or 5xx responses
                return response
            except httpx.HTTPStatusError as e:
                if 400 <= e.response.status_code < 500 and e.response.status_code not in [
                    408,
                    429,
                ]:  # Client errors except Request Timeout and Too Many Requests
                    raise  # Don't retry on these
                if i < self.retries:
                    print(
                        f"Request failed ({e.response.status_code}). Retrying in {self.delay * (2**i):.2f}s..."
                    )
                    await asyncio.sleep(self.delay * (2**i))  # Exponential backoff
                else:
                    raise
            except httpx.RequestError as e:  # Network errors
                if i < self.retries:
                    print(f"Request failed ({e}). Retrying in {self.delay * (2**i):.2f}s...")
                    await asyncio.sleep(self.delay * (2**i))  # Exponential backoff
                else:
                    raise

    async def runs_list(self):
        response = await self._request_with_retry("GET", "/api/maestro/v1/runs")
        return response.json()

    # High-level helper: startRun
    async def start_run(self, pipeline_id: str, estimated_cost: float = 0.01):
        from maestro_sdk.maestro_orchestration_api_client.models.create_run_request import (
            CreateRunRequest,
        )

        create_request = CreateRunRequest(pipeline_id=pipeline_id, estimated_cost=estimated_cost)
        response = await self._request_with_retry(
            "POST", "/api/maestro/v1/runs", json=create_request.to_dict()
        )
        return response.json()

    # High-level helper: tailRunLogs (simplified SSE helper)
    async def tail_logs(self, run_id: str):
        # This is a simplified representation. A full SSE helper would involve
        # streaming the response and parsing events.
        print(f"Tailing logs for run: {run_id} (simplified SSE helper)")
        response = await self._request_with_retry(
            "GET", f"/api/maestro/v1/runs/{run_id}/logs?stream=true"
        )
        # In a real scenario, you'd process the stream here
        return response.text  # Return raw text for simplicity

    # Paginated iterators (conceptual)
    def list_runs_paginated(self):
        print("Returning a paginated iterator for runs (conceptual)")
        # In a real scenario, this would yield results page by page
        yield from []  # Placeholder
