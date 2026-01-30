#!/usr/bin/env python3
import json
import sys
import uuid
from datetime import UTC, datetime, timezone

"""
Summit Provenance Export Tool
Maps OpenLineage events to W3C PROV-O (JSON-LD) terms.

Mental Model:
- Activity <-> pipeline/task run (Airflow task run, dbt node run)
- Entity <-> datasets/artefacts read or produced
- Agent <-> the system or user responsible (Airflow scheduler/worker, dbt runner)
"""

def ol_to_prov(ol_event):
    """
    Transforms an OpenLineage event into a W3C PROV-O JSON-LD representation.
    """
    run_id = ol_event.get('run', {}).get('runId', str(uuid.uuid4()))
    job_namespace = ol_event.get('job', {}).get('namespace', 'unknown')
    job_name = ol_event.get('job', {}).get('name', 'unknown_job')
    event_time = ol_event.get('eventTime', datetime.now().isoformat())
    event_type = ol_event.get('eventType', 'UNKNOWN')

    prov = {
        "@context": {
            "prov": "http://www.w3.org/ns/prov#",
            "summit": "https://summit.platform/lineage/",
            "xsd": "http://www.w3.org/2001/XMLSchema#"
        },
        "@graph": []
    }

    # 1. Activity: The Pipeline/Task Run
    activity_id = f"summit:run:{run_id}"
    activity = {
        "@id": activity_id,
        "@type": "prov:Activity",
        "prov:label": f"Run of {job_name}",
        "summit:jobName": job_name,
        "summit:namespace": job_namespace
    }

    if event_type == 'START':
        activity["prov:startedAtTime"] = {"@value": event_time, "@type": "xsd:dateTime"}
    elif event_type == 'COMPLETE':
        activity["prov:endedAtTime"] = {"@value": event_time, "@type": "xsd:dateTime"}

    prov["@graph"].append(activity)

    # 2. Agent: The Processing Engine (e.g., Airflow)
    agent_id = f"summit:agent:{job_namespace.replace('/', ':')}"
    agent = {
        "@id": agent_id,
        "@type": "prov:Agent",
        "prov:label": f"System responsible for {job_namespace}"
    }
    prov["@graph"].append(agent)

    # Associate Activity with Agent
    activity["prov:wasAssociatedWith"] = {"@id": agent_id}

    # 3. Entities: Input Datasets
    for input_ds in ol_event.get('inputs', []):
        ds_ns = input_ds.get('namespace', 'default')
        ds_name = input_ds.get('name', 'unknown')
        entity_id = f"summit:dataset:{ds_ns.replace('://', ':')}:{ds_name}"

        entity = {
            "@id": entity_id,
            "@type": "prov:Entity",
            "prov:label": f"Input: {ds_name}",
            "summit:location": ds_ns
        }
        prov["@graph"].append(entity)

        # PROV Relationship: Activity used Entity
        if "prov:used" not in activity:
            activity["prov:used"] = []
        activity["prov:used"].append({"@id": entity_id})

    # 4. Entities: Output Datasets
    for output_ds in ol_event.get('outputs', []):
        ds_ns = output_ds.get('namespace', 'default')
        ds_name = output_ds.get('name', 'unknown')
        entity_id = f"summit:dataset:{ds_ns.replace('://', ':')}:{ds_name}"

        entity = {
            "@id": entity_id,
            "@type": "prov:Entity",
            "prov:label": f"Output: {ds_name}",
            "summit:location": ds_ns,
            "prov:wasGeneratedBy": {"@id": activity_id}
        }
        prov["@graph"].append(entity)

    return prov

def main():
    if len(sys.argv) > 1:
        # Read from file
        with open(sys.argv[1]) as f:
            events = json.load(f)
            if isinstance(events, list):
                prov_list = [ol_to_prov(e) for e in events]
                print(json.dumps(prov_list, indent=2))
            else:
                print(json.dumps(ol_to_prov(events), indent=2))
    else:
        # Demonstration mode
        demo_event = {
            "eventType": "COMPLETE",
            "eventTime": datetime.now(UTC).isoformat(),
            "run": {"runId": str(uuid.uuid4())},
            "job": {"namespace": "summit/airflow", "name": "osint_ingestion.validate_and_enrich"},
            "inputs": [{"namespace": "s3://raw-bucket", "name": "social_feeds/2024-01-20.jsonl"}],
            "outputs": [{"namespace": "neo4j://prod-db", "name": "IntelGraphNodes"}]
        }
        print("--- OpenLineage Event (Sample) ---")
        print(json.dumps(demo_event, indent=2))
        print("\n--- W3C PROV-O JSON-LD (Mapped) ---")
        print(json.dumps(ol_to_prov(demo_event), indent=2))

if __name__ == "__main__":
    main()
