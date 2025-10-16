import asyncio
import os
import time

from maestro_sdk.maestro_orchestration_api_client.api.runs import create_run, get_run_by_id
from maestro_sdk.maestro_orchestration_api_client.client import AuthenticatedClient
from maestro_sdk.maestro_orchestration_api_client.models.create_run_request import CreateRunRequest

BASE_URL = os.environ.get("MAESTRO_BASE_URL", "http://localhost:8080")
TOKEN = os.environ.get("MAESTRO_TOKEN", "your_token_here")
PIPELINE_ID = "synthetic-test-pipeline"  # Placeholder for a real pipeline ID


async def run_synthetic_journey():
    client = AuthenticatedClient(base_url=BASE_URL, token=TOKEN)

    try:
        print("Synthetic Journey: Creating Run...")
        create_request = CreateRunRequest(pipeline_id=PIPELINE_ID, estimated_cost=0.01)
        run_response = await create_run.asyncio(client=client, json_body=create_request)
        run_id = run_response.id
        print(f"Run created: {run_id}")

        print("Synthetic Journey: Observing DAG status...")
        # Poll for run status
        status = ""
        for _ in range(10):  # Poll up to 10 times
            run_status = await get_run_by_id.asyncio(client=client, run_id=run_id)
            status = run_status.status
            print(f"Run {run_id} status: {status}")
            if status in ["SUCCESS", "FAILED", "CANCELLED"]:
                break
            time.sleep(5)  # Wait 5 seconds before polling again

        print(f"Synthetic Journey: Run {run_id} completed with status: {status}")

        # Emit synthetic=1 label (conceptual, would be part of metrics/logs)
        print("Emitting synthetic=1 label (conceptual)")

    except Exception as e:
        print(f"Synthetic Journey failed: {e}")


if __name__ == "__main__":
    asyncio.run(run_synthetic_journey())
