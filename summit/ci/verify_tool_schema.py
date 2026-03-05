import json
import os
import sys

from summit.tools.registry import ToolRegistry


def verify_tool_schema(expected_hash: str, tools_file: str):
    """
    Verifies that tools in tools_file match the expected hash.
    """
    if not os.path.exists(tools_file):
        print(f"Tools file not found: {tools_file}")
        sys.exit(1)

    with open(tools_file) as f:
        tools = json.load(f)

    registry = ToolRegistry()
    for tool in tools:
        registry.register_tool(tool)

    current_hash = registry.get_tools_hash()

    if current_hash != expected_hash:
        print(f"Tool schema drift detected! Expected {expected_hash}, got {current_hash}")
        sys.exit(1)

    print("Tool schema verified.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: verify_tool_schema.py <expected_hash> <tools_file>")
        sys.exit(1)
    verify_tool_schema(sys.argv[1], sys.argv[2])
