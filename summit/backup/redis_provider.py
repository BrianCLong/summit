import json
import logging
import os
from datetime import datetime
from typing import Any, Dict

from summit.cache.redis_client import RedisClient

from .core import BackupProvider

logger = logging.getLogger(__name__)

class RedisBackupProvider(BackupProvider):
    def __init__(self, redis_client: RedisClient):
        self.client = redis_client

    def backup(self, destination: str) -> dict[str, Any]:
        """
        Performs logical backup using SCAN and DUMP to a JSONL file.
        Format: {"key": "key_name", "value": "base64_dump", "ttl": milliseconds}
        """
        if not self.client.enabled:
            logger.warning("Redis client disabled, skipping backup.")
            return {"status": "skipped", "reason": "Redis disabled"}

        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"redis_backup_{timestamp}.jsonl"
        filepath = os.path.join(destination, filename)

        count = 0
        try:
            with open(filepath, 'w') as f:
                # Use scan_iter from extended client
                for key in self.client.scan_iter():
                    try:
                        # We need raw DUMP which returns binary serialized value
                        dump_val = self.client.client.dump(key)
                        if dump_val is None:
                            continue

                        # Use PTTL for milliseconds
                        pttl = self.client.client.pttl(key)
                        if pttl == -2: # Key expired/missing
                            continue
                        if pttl == -1:
                            pttl = 0 # Persistent

                        # Need to encode binary dump to store in JSON
                        # Using latin1 is a common trick for binary-in-string or base64
                        import base64
                        dump_b64 = base64.b64encode(dump_val).decode('utf-8')

                        record = {
                            "k": key,
                            "v": dump_b64,
                            "t": pttl
                        }
                        f.write(json.dumps(record) + "\n")
                        count += 1
                    except Exception as e:
                        logger.error(f"Error backing up key {key}: {e}")

            return {
                "status": "success",
                "file": filepath,
                "count": count,
                "timestamp": timestamp
            }
        except Exception as e:
            logger.error(f"Redis backup failed: {e}")
            return {"status": "failed", "error": str(e)}

    def restore(self, source: str) -> bool:
        """
        Restores from a JSONL file using RESTORE command.
        """
        if not self.client.enabled:
            logger.warning("Redis client disabled, skipping restore.")
            return False

        if not os.path.exists(source):
            logger.error(f"Backup file not found: {source}")
            return False

        import base64
        count = 0
        try:
            with open(source) as f:
                pipe = self.client.pipeline()
                for i, line in enumerate(f):
                    try:
                        record = json.loads(line)
                        key = record["k"]
                        dump_b64 = record["v"]
                        pttl = record["t"]

                        dump_val = base64.b64decode(dump_b64)

                        # RESTORE key ttl value [REPLACE]
                        # ttl is in ms. If 0, it means persistent.
                        # However, Redis RESTORE command treats 0 as expired?
                        # Actually RESTORE ttl argument: "If ttl is 0 the key is created without any expire."

                        # Pipeline restore
                        pipe.restore(key, pttl, dump_val, replace=True)

                        if (i + 1) % 1000 == 0:
                            pipe.execute()
                            # Create new pipeline
                            pipe = self.client.pipeline()

                    except Exception as e:
                        logger.error(f"Error restoring line {i+1}: {e}")

                # Execute remaining
                pipe.execute()

            logger.info(f"Redis restore completed from {source}")
            return True
        except Exception as e:
            logger.error(f"Redis restore failed: {e}")
            return False
