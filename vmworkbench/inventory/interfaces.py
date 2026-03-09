from typing import Protocol, List, Dict, Any

class InventoryProvider(Protocol):
    """
    Abstract interface for hardware inventory providers.
    Allows swapping between real host discovery and fixture-based mocks.
    """
    def usb_devices(self) -> List[Dict[str, Any]]:
        """Returns a list of connected USB devices."""
        ...

    def pci_devices(self) -> List[Dict[str, Any]]:
        """Returns a list of connected PCI devices."""
        ...
