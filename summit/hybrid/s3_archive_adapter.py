import os


class S3ArchiveAdapter:
    def __init__(self):
        self.enabled = os.getenv("HYBRID_SOURCES", "off") == "on"

    def fetch_archive(self, archive_key: str):
        if not self.enabled:
            return None
        # Stub for S3 get
        return {"key": archive_key, "source": "s3", "content": "..."}
