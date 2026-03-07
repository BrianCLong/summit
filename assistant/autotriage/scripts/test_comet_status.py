import json
import os
import subprocess
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import comet_status


class TestCometStatus(unittest.TestCase):

    @patch('subprocess.run')
    def test_check_pr_status_success(self, mock_subprocess):
        # Mock successful version check then successful PR check
        mock_version = MagicMock()
        mock_version.returncode = 0

        mock_pr = MagicMock()
        mock_pr.returncode = 0
        mock_pr.stdout = json.dumps({
            "state": "OPEN",
            "statusCheckRollup": {"state": "SUCCESS"}
        })

        mock_subprocess.side_effect = [mock_version, mock_pr]

        state, ci = comet_status.check_pr_status("https://github.com/owner/repo/pull/1")
        self.assertEqual(state, "OPEN")
        self.assertEqual(ci, "SUCCESS")

    @patch('subprocess.run')
    def test_check_pr_status_failure(self, mock_subprocess):
        # Mock successful version check then failed PR check
        mock_version = MagicMock()
        mock_version.returncode = 0

        mock_subprocess.side_effect = [mock_version, subprocess.CalledProcessError(1, "gh")]

        state, ci = comet_status.check_pr_status("https://github.com/owner/repo/pull/1")
        self.assertEqual(state, "not_found")
        self.assertEqual(ci, "unknown")

if __name__ == '__main__':
    unittest.main()
