from typing import Any, Dict, List


def thin_signature(tool_name: str, json_schema: dict[str, Any]) -> str:
    """
    Produce a stable, minimal signature string:
      tool(param1: string, param2?: number) -> any

    Determinism rules:
      - sort properties lexicographically
      - stable optional marker
      - no random IDs / timestamps
    """
    props = json_schema.get("properties", {})
    required = set(json_schema.get("required", []))

    parts = []
    # Sort keys for determinism
    for k in sorted(props.keys()):
        p_schema = props[k]
        # Minimal type inference
        t = p_schema.get("type", "any")
        if isinstance(t, list):
            t = " | ".join(t)

        opt = "" if k in required else "?"
        parts.append(f"{k}{opt}: {t}")

    return f"{tool_name}({', '.join(parts)}) -> any"
