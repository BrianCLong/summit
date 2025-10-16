import json


def map_splunk_to_intelgraph(splunk_json_file_path):
    """
    Maps Splunk log data to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    """
    entities = []
    with open(splunk_json_file_path, encoding="utf-8") as jsonfile:
        logs = json.load(jsonfile)
        for log_entry in logs:
            # Example: Map each log entry to an 'Event' entity
            entities.append(
                {
                    "type": "Event",
                    "properties": {
                        "timestamp": log_entry.get("_time"),
                        "host": log_entry.get("host"),
                        "source": log_entry.get("source"),
                        "sourcetype": log_entry.get("sourcetype"),
                        "event_data": log_entry.get("event"),
                    },
                }
            )
            # Optionally, create relationships or other entities based on parsed event data
            # For instance, if 'host' can be mapped to a 'Device' entity
            entities.append(
                {
                    "type": "Device",
                    "properties": {
                        "name": log_entry.get("host"),
                        "type": "Server",  # Assuming all hosts are servers for simplicity
                    },
                }
            )
    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_splunk_to_intelgraph("sample.json")
    for entity in sample_entities:
        print(entity)
