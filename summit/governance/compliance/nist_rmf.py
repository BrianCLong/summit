def map_to_rmf(events: list) -> dict:
    return {
        "MAP": "Complete",
        "MEASURE": f"{len(events)} events recorded"
    }
