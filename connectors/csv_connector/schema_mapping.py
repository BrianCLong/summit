import csv


def map_csv_to_intelgraph(csv_file_path):
    """
    Maps CSV data to IntelGraph entities.
    For this example, we'll create Person and Project entities.
    """
    entities = []
    with open(csv_file_path, encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row["type"] == "Person":
                entities.append(
                    {
                        "type": "Person",
                        "properties": {
                            "id": row["id"],
                            "name": row["name"],
                            "description": row["description"],
                        },
                    }
                )
            elif row["type"] == "Project":
                entities.append(
                    {
                        "type": "Project",
                        "properties": {
                            "id": row["id"],
                            "name": row["name"],
                            "description": row["description"],
                        },
                    }
                )
    return entities, []


if __name__ == "__main__":
    # Example usage (for testing/demonstration purposes)
    # In a real scenario, this would be called by the ingestion pipeline
    sample_entities = map_csv_to_intelgraph("sample.csv")
    for entity in sample_entities:
        print(entity)
