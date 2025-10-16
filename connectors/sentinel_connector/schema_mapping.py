import json


def map_sentinel_to_intelgraph(sentinel_json_file_path):
    """
    Maps Microsoft Sentinel log data to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    """
    entities = []
    with open(sentinel_json_file_path, encoding="utf-8") as jsonfile:
        logs = json.load(jsonfile)
        for log_entry in logs:
            event_type = log_entry.get("Type")
            time_generated = log_entry.get("TimeGenerated")

            # Map to a generic 'Event' entity
            event_entity = {
                "type": "Event",
                "properties": {
                    "timestamp": time_generated,
                    "event_type": event_type,
                    "event_id": log_entry.get("EventID"),
                    "activity": log_entry.get("Activity"),
                    "raw_log": json.dumps(log_entry),  # Store raw log for full context
                },
            }
            entities.append(event_entity)

            # Map related entities like Computer, Account, IPAddress
            if log_entry.get("Computer"):
                entities.append({"type": "Device", "properties": {"name": log_entry["Computer"]}})
            if log_entry.get("Account"):
                entities.append({"type": "Person", "properties": {"name": log_entry["Account"]}})
            if log_entry.get("IpAddress"):
                entities.append(
                    {"type": "IPAddress", "properties": {"address": log_entry["IpAddress"]}}
                )
            if log_entry.get("CommandLine"):
                entities.append(
                    {"type": "Process", "properties": {"command_line": log_entry["CommandLine"]}}
                )

    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_sentinel_to_intelgraph("sample.json")
    for entity in sample_entities:
        print(entity)
