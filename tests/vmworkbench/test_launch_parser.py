import unittest
import os
from vmworkbench.adapters.qemu.launch_script_parser import parse_launch_script

class TestLaunchScriptParser(unittest.TestCase):
    def test_basic_parse(self):
        script = "qemu-system-x86_64 -m 2048"
        result = parse_launch_script(script)
        self.assertEqual(result["qemu_bin"], "qemu-system-x86_64")
        self.assertEqual(result["qemu_args"], ["-m", "2048"])

    def test_comments_and_whitespace(self):
        script = """
        # A comment
        qemu-system-x86_64 -m 2048 \\
          -enable-kvm
        """
        result = parse_launch_script(script)
        self.assertEqual(result["qemu_bin"], "qemu-system-x86_64")
        self.assertIn("-m", result["qemu_args"])
        self.assertIn("-enable-kvm", result["qemu_args"])

    def test_deny_pipe(self):
        script = "qemu-system-x86_64 -m 2048 | wall pwnd"
        with self.assertRaisesRegex(ValueError, "forbidden token"):
            parse_launch_script(script)

    def test_deny_subshell(self):
        script = "qemu-system-x86_64 -m $(id)"
        with self.assertRaisesRegex(ValueError, "forbidden token"):
            parse_launch_script(script)

    def test_deny_multiple_lines(self):
        script = "qemu-system-x86_64 -m 2048\nls /"
        with self.assertRaisesRegex(ValueError, "multiple command lines not allowed"):
            parse_launch_script(script)

    def test_fixtures(self):
        fixtures_dir = "tests/fixtures"

        # Test allow
        allow_path = os.path.join(fixtures_dir, "allow", "basic_qemu.sh")
        if os.path.exists(allow_path):
            with open(allow_path, 'r') as f:
                content = f.read()
                result = parse_launch_script(content)
                self.assertEqual(result["qemu_bin"], "qemu-system-x86_64")

        # Test deny
        deny_path = os.path.join(fixtures_dir, "deny", "pipe.sh")
        if os.path.exists(deny_path):
            with open(deny_path, 'r') as f:
                content = f.read()
                with self.assertRaises(ValueError):
                    parse_launch_script(content)

if __name__ == "__main__":
    unittest.main()
