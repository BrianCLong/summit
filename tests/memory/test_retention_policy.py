import os
import time

from summit.memory.retention import RetentionPolicy


def test_retention_archives_old_file(tmp_path):
    f = tmp_path / "ledger.jsonl"
    f.touch()

    # Set mtime to 31 days ago
    old_time = time.time() - (31 * 86400) - 100
    os.utime(f, (old_time, old_time))

    policy = RetentionPolicy(max_age_days=30)
    policy.enforce(f)

    assert not f.exists()
    assert (tmp_path / "ledger.jsonl.old").exists()
