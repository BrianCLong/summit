from typing import Any


def generate_passthrough_plan(selected_pci: list[str]) -> dict[str, Any]:
    """
    Generates a 'plan-only' DangerousOperationPlan for VFIO passthrough.
    Does NOT perform any system mutations.
    """
    if not selected_pci:
        raise ValueError("no PCI devices selected for passthrough")

    plan = {
        "kind": "vfio_passthrough",
        "mode": "plan-only",
        "steps": [
            {
                "action": "verify_iommu_enabled",
                "notes": "Ensure IOMMU is enabled in BIOS and kernel command line (intel_iommu=on or amd_iommu=on)"
            },
            {
                "action": "bind_to_vfio",
                "devices": selected_pci,
                "notes": "Bind the selected PCI devices to the vfio-pci driver."
            },
            {
                "action": "regenerate_initramfs",
                "notes": "Optional: Update initramfs to ensure vfio-pci loads before other drivers."
            }
        ],
        "rollback": [
            {
                "action": "unbind_from_vfio",
                "devices": selected_pci,
                "notes": "Unbind devices from vfio-pci and restore original drivers."
            }
        ]
    }

    return plan
