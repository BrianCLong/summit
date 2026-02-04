from typing import List, Optional

from summit.scouts.base import Config, Result


def check_budget(result: Result, cfg: Config) -> bool:
    if result.cost_ms > cfg.max_cost_ms:
        return False
    # Simplified byte check on artifacts
    total_bytes = sum(len(a) for a in result.artifacts) # Assuming artifacts are strings here
    if total_bytes > cfg.max_output_bytes:
        return False
    return True

def check_allowlist(tool_name: str, cfg: Config) -> bool:
    return tool_name in cfg.allowlisted_tools
