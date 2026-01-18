"""
Minimal OpenLineage to W3C PROV-O Mapper.
Maps OL Jobs/Runs -> PROV Activities and Datasets -> PROV Entities.
"""

import json
import uuid
from datetime import datetime

class ProvMapper:
    def __init__(self):
        self.context = {
            "prov": "http://www.w3.org/ns/prov#",
            "ol": "https://openlineage.io/spec/",
            "xsd": "http://www.w3.org/2001/XMLSchema#"
        }

    def _generate_id(self):
        return str(uuid.uuid4())

    def map_event(self, ol_event: dict) -> dict:
        """
        Maps an OpenLineage event to a PROV-O JSON-LD structure.
        """
        run = ol_event.get("run", {})
        job = ol_event.get("job", {})
        inputs = ol_event.get("inputs", [])
        outputs = ol_event.get("outputs", [])
        event_time = ol_event.get("eventTime")
        run_id = run.get("runId")
        job_name = job.get("name")
        job_namespace = job.get("namespace")

        activity_id = f"urn:ol:run:{run_id}"
        agent_id = f"urn:ol:job:{job_namespace}:{job_name}"

        graph = []

        # 1. Activity (The Run)
        activity = {
            "@id": activity_id,
            "@type": "prov:Activity",
            "prov:startedAtTime": {
                "@value": event_time,
                "@type": "xsd:dateTime"
            },
            "prov:wasAssociatedWith": agent_id
        }
        graph.append(activity)

        # 2. Agent (The Job)
        agent = {
            "@id": agent_id,
            "@type": "prov:Agent",
            "prov:label": job_name
        }
        graph.append(agent)

        # 3. Entities (Inputs -> used)
        for ds in inputs:
            ds_urn = f"urn:ol:dataset:{ds.get('namespace')}:{ds.get('name')}"
            entity = {
                "@id": ds_urn,
                "@type": "prov:Entity",
                "prov:label": ds.get("name")
            }
            graph.append(entity)

            # Relation: Activity used Entity
            usage = {
                "@type": "prov:Usage",
                "prov:entity": ds_urn,
                "prov:activity": activity_id
            }
            # We can embed usage in activity or strictly follow flattened JSON-LD.
            # For this minimal mapper, adding 'prov:used' property to Activity is simpler if we weren't building a flat graph.
            # But in flat graph:
            activity["prov:used"] = activity.get("prov:used", [])
            if isinstance(activity["prov:used"], str):
                activity["prov:used"] = [activity["prov:used"]]
            activity["prov:used"].append(ds_urn)

        # 4. Entities (Outputs -> wasGeneratedBy)
        for ds in outputs:
            ds_urn = f"urn:ol:dataset:{ds.get('namespace')}:{ds.get('name')}"
            entity = {
                "@id": ds_urn,
                "@type": "prov:Entity",
                "prov:label": ds.get("name"),
                "prov:wasGeneratedBy": activity_id
            }
            graph.append(entity)

        prov_doc = {
            "@context": self.context,
            "@graph": graph
        }
        return prov_doc

if __name__ == "__main__":
    # Example usage
    sample_event = {
        "eventTime": datetime.now().isoformat(),
        "run": {"runId": "d46c0738-4ac2-4bb7-b6f2-3e3e4f719999"},
        "job": {"namespace": "my-namespace", "name": "my-job"},
        "inputs": [{"namespace": "db", "name": "source_table"}],
        "outputs": [{"namespace": "db", "name": "target_table"}]
    }

    mapper = ProvMapper()
    print(json.dumps(mapper.map_event(sample_event), indent=2))
