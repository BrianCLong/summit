import json


def map_json_to_intelgraph(json_file_path):
    """
    Maps JSON data to IntelGraph entities and relationships.
    Handles nested objects and arrays to create a more complex graph.
    """
    entities = []
    relationships = []

    with open(json_file_path, encoding="utf-8") as jsonfile:
        data = json.load(jsonfile)
        for item in data:
            # Map Person entity
            if item["type"] == "Person":
                person_id = item["id"]
                entities.append(
                    {
                        "type": "Person",
                        "properties": {
                            "id": person_id,
                            "name": item["name"],
                            "email": item.get("email"),
                        },
                    }
                )

                # Map Organization and 'WORKS_AT' relationship
                if "works_at" in item and item["works_at"]["type"] == "Organization":
                    org_id = item["works_at"]["id"]
                    entities.append(
                        {
                            "type": "Organization",
                            "properties": {"id": org_id, "name": item["works_at"]["name"]},
                        }
                    )
                    relationships.append(
                        {
                            "type": "WORKS_AT",
                            "source_id": person_id,
                            "source_type": "Person",
                            "target_id": org_id,
                            "target_type": "Organization",
                            "properties": {},
                        }
                    )

                # Map Projects and 'WORKS_ON' relationships
                if "projects" in item and isinstance(item["projects"], list):
                    for project_data in item["projects"]:
                        project_id = project_data["id"]
                        entities.append(
                            {
                                "type": "Project",
                                "properties": {
                                    "id": project_id,
                                    "name": project_data["name"],
                                    "status": project_data.get("status"),
                                },
                            }
                        )
                        relationships.append(
                            {
                                "type": "WORKS_ON",
                                "source_id": person_id,
                                "source_type": "Person",
                                "target_id": project_id,
                                "target_type": "Project",
                                "properties": {},
                            }
                        )

    return entities, relationships


if __name__ == "__main__":
    # Example usage (for testing/demonstration purposes)
    entities, relationships = map_json_to_intelgraph("sample.json")
    print("Entities:")
    for entity in entities:
        print(entity)
    print("\nRelationships:")
    for rel in relationships:
        print(rel)
