from typing import List


def to_context_pack(traj_paths: list[str]) -> bytes:
    """
    Deterministically converts trajectories into context packs.
    """
    # TODO: stable ordering; no timestamps; redact per manifest
    return b"{}"
