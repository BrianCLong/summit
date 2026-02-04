import unittest
from vmworkbench.inventory.classify import classify_device

class TestInventoryClassify(unittest.TestCase):
    def test_classify_keyboard(self):
        dev = {"kind": "usb", "description": "Generic USB Keyboard"}
        self.assertEqual(classify_device(dev), "critical-host-input")

    def test_classify_mouse(self):
        dev = {"kind": "usb", "description": "Optical Mouse"}
        self.assertEqual(classify_device(dev), "critical-host-input")

    def test_classify_storage(self):
        dev = {"kind": "usb", "description": "Flash Drive"}
        self.assertEqual(classify_device(dev), "generic")

    def test_classify_gpu(self):
        dev = {"kind": "pci", "description": "VGA compatible controller: NVIDIA Corporation"}
        self.assertEqual(classify_device(dev), "generic")

    def test_classify_bridge(self):
        dev = {"kind": "pci", "description": "Host bridge: Intel Corporation"}
        self.assertEqual(classify_device(dev), "critical-host-input")

if __name__ == "__main__":
    unittest.main()
