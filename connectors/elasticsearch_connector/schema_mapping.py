import json


def map_elasticsearch_to_intelgraph(es_json_file_path):
    """
    Maps Elasticsearch log data to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    """
    entities = []
    with open(es_json_file_path, encoding="utf-8") as jsonfile:
        logs = json.load(jsonfile)
        for log_entry in logs:
            # Example: Map each log entry to an 'Event' entity
            entities.append(
                {
                    "type": "Event",
                    "properties": {
                        "timestamp": log_entry.get("@timestamp"),
                        "log_level": log_entry.get("log.level"),
                        "message": log_entry.get("message"),
                        "host": log_entry.get("host.name"),
                    },
                }
            )
            # Optionally, create 'User' or 'Host' entities
            if log_entry.get("user.name"):
                entities.append(
                    {"type": "Person", "properties": {"name": log_entry.get("user.name")}}
                )
            if log_entry.get("host.name"):
                entities.append(
                    {
                        "type": "Device",
                        "properties": {
                            "name": log_entry.get("host.name"),
                            "type": "Server",  # Assuming all hosts are servers for simplicity
                        },
                    }
                )
    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_elasticsearch_to_intelgraph("sample.json")
    for entity in sample_entities:
        print(entity)
