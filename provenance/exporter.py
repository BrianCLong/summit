import json
import os
from templates.prov_json import format_prov_json

class ProvenanceExporter:
    def __init__(self):
        pass

    def export_from_slsa(self, slsa_path, output_path):
        if not os.path.exists(slsa_path):
            print(f"Source file {slsa_path} not found.")
            return

        with open(slsa_path, "r") as f:
            lines = f.readlines()

        entities = {}
        activities = {}
        agents = {}
        relations = []

        for line in lines:
            try:
                data = json.loads(line)
                # Map SLSA to PROV
                # Subject -> Entity
                for subject in data.get("subject", []):
                    entity_id = f"summit:artifact:{subject['name']}"
                    entities[entity_id] = {
                        "prov:label": subject['name'],
                        "summit:digest": subject['digest'].get('sha256', '')
                    }

                # Builder -> Agent
                predicate = data.get("predicate", {})
                builder_id = predicate.get("builder", {}).get("id", "unknown-builder")
                agent_id = f"summit:agent:{builder_id.split('/')[-1]}"
                agents[agent_id] = {
                    "prov:label": builder_id,
                    "prov:type": "prov:SoftwareAgent"
                }

                # Invocation -> Activity
                invocation = predicate.get("invocation", {})
                config_source = invocation.get("configSource", {})
                activity_id = f"summit:activity:{config_source.get('entryPoint', 'unknown-task').replace('/', '_')}"
                activities[activity_id] = {
                    "prov:label": config_source.get('entryPoint', 'Execution'),
                    "summit:uri": config_source.get('uri', '')
                }

                # Relations
                relations.append({
                    "type": "wasAssociatedWith",
                    "activity": activity_id,
                    "agent": agent_id
                })

                for subject in data.get("subject", []):
                    entity_id = f"summit:artifact:{subject['name']}"
                    relations.append({
                        "type": "wasGeneratedBy",
                        "entity": entity_id,
                        "activity": activity_id
                    })

            except Exception as e:
                print(f"Error parsing line: {e}")

        prov_json = format_prov_json(entities, activities, agents, relations)

        with open(output_path, "w") as f:
            json.dump(prov_json, f, indent=2)
        print(f"Exported PROV-JSON to {output_path}")

if __name__ == "__main__":
    exporter = ProvenanceExporter()
    exporter.export_from_slsa("provenance/sample-provenance.intoto.jsonl", "provenance/prov-export.json")
