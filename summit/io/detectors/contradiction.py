from typing import Any, Dict, List


def detect_contradictions(clusters: list[dict[str, Any]], window_minutes: int = 60) -> list[dict[str, Any]]:
    """
    Detects contradictions where the same asset (media_hash) is used in clusters with opposite stances.

    clusters structure:
    [
        {
            "id": "c1",
            "stance": "pro_intervention",
            "items": [
                {"media_hashes": ["hash123"], "ts": "2026-01-03T10:00:00Z"}
            ]
        },
        ...
    ]
    """
    alerts = []

    # Map hash to list of (cluster_id, stance, timestamp)
    hash_map = {}

    for cluster in clusters:
        cluster_id = cluster.get("id")
        stance = cluster.get("stance")
        for item in cluster.get("items", []):
            ts = item.get("ts") # Assume string comparable or handled
            for media_hash in item.get("media_hashes", []):
                if media_hash not in hash_map:
                    hash_map[media_hash] = []
                hash_map[media_hash].append({
                    "cluster_id": cluster_id,
                    "stance": stance,
                    "ts": ts
                })

    # Check for contradictions
    for media_hash, occurrences in hash_map.items():
        if len(occurrences) < 2:
            continue

        for i in range(len(occurrences)):
            for j in range(i + 1, len(occurrences)):
                occ1 = occurrences[i]
                occ2 = occurrences[j]

                if occ1["stance"] != occ2["stance"]:
                    # In a real impl, check timestamp diff < window_minutes
                    alerts.append({
                        "type": "contradiction",
                        "media_hash": media_hash,
                        "cluster_a": occ1["cluster_id"],
                        "cluster_b": occ2["cluster_id"],
                        "stance_a": occ1["stance"],
                        "stance_b": occ2["stance"],
                        "details": "Same asset used in opposing stances."
                    })

    return alerts
