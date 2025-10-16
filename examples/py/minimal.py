import asyncio

from maestro_sdk.client import MaestroClient

BASE_URL = "http://localhost:8080"  # Your Maestro API URL
TOKEN = "your_auth_token"  # Your authentication token


async def main():
    client = MaestroClient(base_url=BASE_URL, token=TOKEN)

    try:
        print("Listing runs...")
        runs = await client.runs_list()  # Using the low-level generated client method
        if runs:
            for run in runs:
                print(f"Run ID: {run['id']}, Status: {run['status']}")
        else:
            print("No runs found.")

        # Start a new run
        print("\nStarting a new run...")
        new_run = await client.start_run(pipeline_id="my-python-pipeline", estimated_cost=0.02)
        print(f"New Run ID: {new_run['id']}")

        # Tail run logs
        print("\nTailing logs for the new run (simplified)...")
        logs = await client.tail_logs(new_run["id"])
        print("Logs:", logs)

        # Fetch evidence (placeholder)
        print("\nFetching evidence (conceptual)...")
        # evidence = await client.fetch_evidence("evidence-id-456")
        # print("Evidence:", evidence)

    except Exception as e:
        print(f"Error in SDK example: {e}")


if __name__ == "__main__":
    asyncio.run(main())
