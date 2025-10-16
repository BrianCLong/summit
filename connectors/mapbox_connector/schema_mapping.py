import json


def map_mapbox_to_intelgraph(mapbox_json_file_path):
    """
    Maps Mapbox GeoJSON data to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    """
    entities = []
    with open(mapbox_json_file_path, encoding="utf-8") as jsonfile:
        feature_collection = json.load(jsonfile)
        for feature in feature_collection.get("features", []):
            if feature.get("geometry", {}).get("type") == "Point":
                coordinates = feature["geometry"]["coordinates"]
                properties = feature.get("properties", {})
                entities.append(
                    {
                        "type": "Location",
                        "properties": {
                            "name": properties.get("name"),
                            "latitude": coordinates[1],
                            "longitude": coordinates[0],
                            "location_type": properties.get("type"),
                        },
                    }
                )
    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_mapbox_to_intelgraph("sample.json")
    for entity in sample_entities:
        print(entity)
