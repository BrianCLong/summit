from typing import Any

# Deny-by-default safety classifications
# Keyboards and mice are critical to host operation and should not be passed through by default.

NEVER_PASSTHROUGH = {
    "usb": ["keyboard", "mouse", "hub"],
    "pci": ["host bridge", "isa bridge", "ethernet controller"]
}

def classify_device(dev: dict[str, Any]) -> str:
    """
    Classifies a device based on its reported kind and description.
    """
    kind = dev.get("kind", "unknown")
    desc = dev.get("description", "").lower()

    if kind in NEVER_PASSTHROUGH:
        for blocked in NEVER_PASSTHROUGH[kind]:
            if blocked in desc:
                return "critical-host-input"

    return "generic"
