from typing import Any, Protocol


class InventoryProvider(Protocol):
    """
    Abstract interface for hardware inventory providers.
    Allows swapping between real host discovery and fixture-based mocks.
    """
    def usb_devices(self) -> list[dict[str, Any]]:
        """Returns a list of connected USB devices."""
        ...

    def pci_devices(self) -> list[dict[str, Any]]:
        """Returns a list of connected PCI devices."""
        ...
