import unittest
from modules.sipl.module import SIPLConfig, run_sipl

class TestSIPL(unittest.TestCase):
    def test_config_default(self):
        config = SIPLConfig()
        self.assertFalse(config.enabled)
        self.assertEqual(config.suffix_len, 128)

    def test_run_sipl_disabled(self):
        config = SIPLConfig(enabled=False)
        result = run_sipl(config, None)
        self.assertTrue(result.get("skipped"))

    def test_run_sipl_not_implemented(self):
        config = SIPLConfig(enabled=True)
        with self.assertRaises(NotImplementedError):
            run_sipl(config, None)

if __name__ == "__main__":
    unittest.main()
