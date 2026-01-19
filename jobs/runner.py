import uuid
import sys
import time
from lineage.openlineage_producer import OpenLineageProducer

def run_job(job_name, inputs=None, outputs=None):
    producer = OpenLineageProducer()
    run_id = str(uuid.uuid4())

    print(f"Starting job: {job_name} (Run ID: {run_id})")
    producer.start_job(job_name, run_id, inputs=inputs)

    try:
        # Simulate job work
        time.sleep(1)
        print(f"Executing {job_name} logic...")

        producer.complete_job(job_name, run_id, outputs=outputs)
        print(f"Job {job_name} completed successfully.")
    except Exception as e:
        print(f"Job {job_name} failed: {e}")
        producer.fail_job(job_name, run_id)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python jobs/runner.py <job_name>")
        sys.exit(1)

    job_name = sys.argv[1]
    # Example inputs/outputs for demonstration
    example_inputs = [
        {
            "namespace": "postgres",
            "name": "raw_data_table",
            "facets": {
                "dataSource": {"uri": "postgresql://localhost:5432/summit"}
            }
        }
    ]
    example_outputs = [
        {
            "namespace": "postgres",
            "name": "processed_insights_table",
            "facets": {
                "dataSource": {"uri": "postgresql://localhost:5432/summit"}
            }
        }
    ]

    run_job(job_name, inputs=example_inputs, outputs=example_outputs)
