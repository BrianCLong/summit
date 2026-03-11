import unittest
from unittest.mock import MagicMock, patch
from summit.backup.manager import BackupManager

class TestBackupManagerExtended(unittest.TestCase):
    def setUp(self):
        self.manager = BackupManager("/tmp/backups")
        self.mock_provider = MagicMock()
        self.manager.register_provider("test_prov", self.mock_provider)

    def test_list_backups(self):
        with patch("os.listdir") as mock_listdir:
            mock_listdir.return_value = ["backup1.jsonl", "backup2.jsonl"]
            backups = self.manager.list_backups()
            self.assertEqual(backups, ["backup1.jsonl", "backup2.jsonl"])

    def test_execute_restore(self):
        self.mock_provider.restore.return_value = True
        result = self.manager.execute_restore("test_prov", "/tmp/backup.jsonl")
        self.assertTrue(result)
        self.mock_provider.restore.assert_called_with("/tmp/backup.jsonl")

if __name__ == '__main__':
    unittest.main()
