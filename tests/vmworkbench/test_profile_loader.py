import os
import unittest

from vmworkbench.profiles.loader import ProfileLoader


class TestProfileLoader(unittest.TestCase):
    def test_load_from_dir(self):
        fixture_dir = "tests/fixtures/profiles"
        loader = ProfileLoader(builtin_dir=fixture_dir, user_dir="/nonexistent")
        loader.load_all()

        self.assertIn("ubuntu-minimal", loader.list_profiles())
        profile = loader.get_profile("ubuntu-minimal")
        self.assertEqual(profile["qemu_profile"], "virt-vga")
        self.assertEqual(profile["default_args"], ["-m", "2048", "-cpu", "host"])

if __name__ == "__main__":
    unittest.main()
