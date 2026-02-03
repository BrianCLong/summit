from enum import Enum, auto


class ToolRisk(Enum):
    LOW = auto()
    MEDIUM = auto()
    HIGH = auto()

# Example mapping
TOOL_RISK_MAP = {
    "read_file": ToolRisk.LOW,
    "delete_file": ToolRisk.HIGH,
    "send_payment": ToolRisk.HIGH,
}

def get_tool_risk(tool_name: str) -> ToolRisk:
    return TOOL_RISK_MAP.get(tool_name, ToolRisk.MEDIUM) # Default to Medium
