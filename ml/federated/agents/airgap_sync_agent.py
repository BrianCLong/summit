"""
Air-Gap Synchronization Agent

Handles file-based synchronization for air-gapped federated learning.
"""

import hashlib
import json
import logging
import pickle
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class SyncConfig:
    agent_id: str = "airgap_sync"
    import_path: str = "./airgap_import"
    export_path: str = "./airgap_export"
    archive_path: str = "./airgap_archive"
    verify_checksums: bool = True
    auto_archive: bool = True


class AirgapSyncAgent:
    """Handles air-gap synchronization for federated learning"""

    def __init__(self, config: SyncConfig):
        self.config = config
        self._processed_files: set = set()

        # Initialize directories
        for path in [config.import_path, config.export_path, config.archive_path]:
            Path(path).mkdir(parents=True, exist_ok=True)

        logger.info(f"Airgap sync agent {config.agent_id} initialized")

    def export_model(self, model_data: Dict[str, Any], round_number: int) -> str:
        """Export model for transfer to air-gapped nodes"""
        export_file = Path(self.config.export_path) / f"model_round_{round_number}.pkl"

        export_package = {
            "round_number": round_number,
            "model_data": model_data,
            "timestamp": time.time(),
            "checksum": self._compute_checksum(model_data),
        }

        with open(export_file, "wb") as f:
            pickle.dump(export_package, f)

        # Write manifest
        manifest = {
            "round_number": round_number,
            "timestamp": time.time(),
            "checksum": export_package["checksum"],
            "file": export_file.name,
        }
        manifest_file = export_file.with_suffix(".manifest.json")
        with open(manifest_file, "w") as f:
            json.dump(manifest, f, indent=2)

        logger.info(f"Exported model round {round_number} to {export_file}")
        return str(export_file)

    def import_updates(self, round_number: int) -> List[Dict[str, Any]]:
        """Import updates from air-gapped nodes"""
        import_path = Path(self.config.import_path)
        updates = []

        for update_file in import_path.glob(f"update_round_{round_number}_*.pkl"):
            if str(update_file) in self._processed_files:
                continue

            try:
                with open(update_file, "rb") as f:
                    update_data = pickle.load(f)

                # Verify checksum
                if self.config.verify_checksums:
                    manifest_file = update_file.with_suffix(".manifest.json")
                    if manifest_file.exists():
                        with open(manifest_file) as f:
                            manifest = json.load(f)
                        if manifest.get("checksum") != self._compute_checksum(
                            update_data.get("parameters")
                        ):
                            logger.warning(f"Checksum mismatch for {update_file}")
                            continue

                updates.append(update_data)
                self._processed_files.add(str(update_file))

                # Archive
                if self.config.auto_archive:
                    self._archive_file(update_file)

                logger.info(f"Imported update from {update_file}")

            except Exception as e:
                logger.error(f"Failed to import {update_file}: {e}")

        return updates

    def _compute_checksum(self, data: Any) -> str:
        """Compute SHA256 checksum"""
        serialized = pickle.dumps(data)
        return hashlib.sha256(serialized).hexdigest()

    def _archive_file(self, file_path: Path) -> None:
        """Archive processed file"""
        archive_dest = Path(self.config.archive_path) / file_path.name
        shutil.move(str(file_path), str(archive_dest))

        manifest = file_path.with_suffix(".manifest.json")
        if manifest.exists():
            shutil.move(str(manifest), str(archive_dest.with_suffix(".manifest.json")))

    def get_pending_imports(self) -> List[str]:
        """List pending import files"""
        import_path = Path(self.config.import_path)
        return [
            f.name for f in import_path.glob("*.pkl")
            if str(f) not in self._processed_files
        ]

    def get_status(self) -> Dict[str, Any]:
        """Get sync agent status"""
        return {
            "agent_id": self.config.agent_id,
            "processed_files": len(self._processed_files),
            "pending_imports": len(self.get_pending_imports()),
            "paths": {
                "import": self.config.import_path,
                "export": self.config.export_path,
                "archive": self.config.archive_path,
            },
        }
