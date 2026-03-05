import logging
import os
from typing import Any, Dict, Type

from summit.cache.redis_client import RedisClient

from .core import BackupProvider
from .redis_provider import RedisBackupProvider

logger = logging.getLogger(__name__)

class BackupManager:
    def __init__(self, backup_dir: str = "/tmp/backups"):
        self.backup_dir = backup_dir
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)

        self.providers: dict[str, BackupProvider] = {}

        # Register default providers
        self.register_provider("redis", RedisBackupProvider(RedisClient()))

    def register_provider(self, name: str, provider: BackupProvider):
        self.providers[name] = provider

    def execute_backup(self, provider_name: str) -> dict[str, Any]:
        provider = self.providers.get(provider_name)
        if not provider:
            logger.error(f"Provider {provider_name} not found")
            return {"status": "error", "message": "Provider not found"}

        return provider.backup(self.backup_dir)

    def execute_restore(self, provider_name: str, source_file: str) -> bool:
        provider = self.providers.get(provider_name)
        if not provider:
            logger.error(f"Provider {provider_name} not found")
            return False

        return provider.restore(source_file)

    def list_backups(self) -> list[str]:
        return os.listdir(self.backup_dir)
