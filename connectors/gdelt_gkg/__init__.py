"""GDELT GKG connector package."""

from .schema_mapping import GKGRecord, derive_observation_id, map_gkg_to_intelgraph, parse_gkg_line

__all__ = [
    "GKGRecord",
    "derive_observation_id",
    "map_gkg_to_intelgraph",
    "parse_gkg_line",
]
