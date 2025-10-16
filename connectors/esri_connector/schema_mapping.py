import json


def map_esri_to_intelgraph(esri_json_file_path):
    """
    Maps ESRI FeatureSet data to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    """
    entities = []
    with open(esri_json_file_path, encoding="utf-8") as jsonfile:
        feature_set = json.load(jsonfile)
        for feature in feature_set.get("features", []):
            attributes = feature.get("attributes", {})
            geometry = feature.get("geometry", {})

            if feature_set.get("geometryType") == "esriGeometryPoint":
                entities.append(
                    {
                        "type": "Location",
                        "properties": {
                            "name": attributes.get("Name"),
                            "latitude": geometry.get("y"),
                            "longitude": geometry.get("x"),
                            "location_type": attributes.get("Type"),
                        },
                    }
                )
    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_esri_to_intelgraph("sample.json")
    for entity in sample_entities:
        print(entity)
