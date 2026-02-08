import unittest
from unittest.mock import patch, MagicMock
import json
import sys
import os

# Add project root to sys.path so we can import summit modules
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Now we can import
try:
    from summit.agents.osint.recon_agent import ReconAgent
    from summit.flags import is_feature_enabled
except ImportError as e:
    # If this fails, it might be because summit is not recognized as a package or path is wrong
    print(f"ImportError: {e}")
    print(f"sys.path: {sys.path}")
    raise

class TestReconAgent(unittest.TestCase):
    def setUp(self):
        pass

    @patch('summit.agents.osint.recon_agent.is_feature_enabled')
    def test_init_enabled(self, mock_is_enabled):
        mock_is_enabled.return_value = True
        agent = ReconAgent("test", [])
        self.assertTrue(agent.enabled)

    def test_process_disabled(self):
        # We need to mock is_feature_enabled for the import time or instance creation
        # Since is_feature_enabled is imported in recon_agent.py, we might need to patch where it is used
        with patch('summit.agents.osint.recon_agent.is_feature_enabled') as mock_flag:
            mock_flag.return_value = False
            agent = ReconAgent("test", [])
            result = agent.process({"target": "example.com"})
            self.assertEqual(result["action"], "skip")

    @patch('urllib.request.urlopen')
    def test_find_subdomains_success(self, mock_urlopen):
        # Mock response
        mock_response = MagicMock()
        mock_response.status = 200
        data = [
            {"name_value": "sub1.example.com"},
            {"name_value": "sub2.example.com\nsub3.example.com"}
        ]
        mock_response.read.return_value = json.dumps(data).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        # Ensure agent is enabled
        with patch('summit.agents.osint.recon_agent.is_feature_enabled', return_value=True):
            agent = ReconAgent("test", [])
            subdomains = agent.find_subdomains("example.com")

            self.assertEqual(len(subdomains), 3)
            self.assertIn("sub1.example.com", subdomains)
            self.assertIn("sub2.example.com", subdomains)
            self.assertIn("sub3.example.com", subdomains)

    @patch('urllib.request.urlopen')
    def test_find_subdomains_error(self, mock_urlopen):
        mock_urlopen.side_effect = Exception("Network error")

        with patch('summit.agents.osint.recon_agent.is_feature_enabled', return_value=True):
            agent = ReconAgent("test", [])
            subdomains = agent.find_subdomains("example.com")
            self.assertEqual(subdomains, [])

if __name__ == '__main__':
    unittest.main()
