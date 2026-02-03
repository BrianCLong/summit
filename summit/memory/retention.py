import os
import time
from pathlib import Path


class RetentionPolicy:
    def __init__(self, max_age_days: int = 30):
        self.max_age_days = max_age_days

    def enforce(self, path: Path):
        if not path.exists():
            return

        stat = path.stat()
        mtime = stat.st_mtime
        age = time.time() - mtime
        if age > self.max_age_days * 86400:
             # Archive: rename to .old
             path.rename(path.with_suffix(".jsonl.old"))
