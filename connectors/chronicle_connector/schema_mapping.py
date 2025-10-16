import json


def map_chronicle_to_intelgraph(chronicle_json_file_path):
    """
    Maps Chronicle security log data to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    """
    entities = []
    with open(chronicle_json_file_path, encoding="utf-8") as jsonfile:
        logs = json.load(jsonfile)
        for log_entry in logs:
            event_type = log_entry.get("metadata", {}).get("event_type")
            event_timestamp = log_entry.get("metadata", {}).get("event_timestamp")

            # Map to a generic 'Event' entity
            event_entity = {
                "type": "Event",
                "properties": {
                    "timestamp": event_timestamp,
                    "event_type": event_type,
                    "log_type": log_entry.get("metadata", {}).get("log_type"),
                    "raw_log": json.dumps(log_entry),  # Store raw log for full context
                },
            }
            entities.append(event_entity)

            # Map principal (source) to entities
            principal = log_entry.get("principal", {})
            if principal.get("ip"):
                entities.append({"type": "IPAddress", "properties": {"address": principal["ip"]}})
            if principal.get("hostname"):
                entities.append({"type": "Device", "properties": {"name": principal["hostname"]}})
            if principal.get("user", {}).get("userid"):
                entities.append(
                    {"type": "Person", "properties": {"userid": principal["user"]["userid"]}}
                )

            # Map target to entities
            target = log_entry.get("target", {})
            if target.get("fqdn"):
                entities.append({"type": "Domain", "properties": {"name": target["fqdn"]}})
            if target.get("ip"):
                entities.append({"type": "IPAddress", "properties": {"address": target["ip"]}})
            if target.get("process", {}).get("file_name"):
                entities.append(
                    {"type": "File", "properties": {"name": target["process"]["file_name"]}}
                )

    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_chronicle_to_intelgraph("sample.json")
    for entity in sample_entities:
        print(entity)
