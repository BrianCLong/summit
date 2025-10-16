import json


def map_stix_to_intelgraph(stix_json_file_path):
    """
    Maps STIX data to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    """
    entities = []
    with open(stix_json_file_path, encoding="utf-8") as jsonfile:
        bundle = json.load(jsonfile)
        for stix_object in bundle.get("objects", []):
            if stix_object["type"] == "indicator":
                entities.append(
                    {
                        "type": "Indicator",
                        "properties": {
                            "id": stix_object["id"],
                            "pattern": stix_object.get("pattern"),
                            "description": stix_object.get("description"),
                        },
                    }
                )
            elif stix_object["type"] == "malware":
                entities.append(
                    {
                        "type": "Malware",
                        "properties": {
                            "id": stix_object["id"],
                            "name": stix_object.get("name"),
                            "description": stix_object.get("description"),
                        },
                    }
                )
    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_stix_to_intelgraph("sample.json")
    for entity in sample_entities:
        print(entity)
