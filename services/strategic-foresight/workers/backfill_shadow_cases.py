"""Idempotent backfill worker for shadow tables."""

from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import Iterable
from dataclasses import dataclass, field

logger = logging.getLogger("backfill_shadow_cases")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


@dataclass
class Checkpoint:
    last_id: str | None = None
    processed: int = 0

    @classmethod
    def load(cls, path: str) -> Checkpoint:
        if not os.path.exists(path):
            return cls()
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        return cls(last_id=data.get("last_id"), processed=int(data.get("processed", 0)))

    def persist(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump({"last_id": self.last_id, "processed": self.processed}, handle)


@dataclass
class BackfillWorker:
    batch_size: int = 500
    rps_flag: str = "db.backfill.rps"
    checkpoint_path: str = "/tmp/backfill_shadow_cases.json"
    failures: list[str] = field(default_factory=list)

    def run(self) -> None:
        checkpoint = Checkpoint.load(self.checkpoint_path)
        logger.info("starting backfill", extra={"checkpoint": checkpoint.__dict__})

        for batch in self._generate_batches(start_after=checkpoint.last_id):
            self._apply_batch(batch)
            checkpoint.last_id = batch[-1]
            checkpoint.processed += len(batch)
            checkpoint.persist(self.checkpoint_path)
            time.sleep(self._rate_limit_delay())

        logger.info(
            "backfill-complete",
            extra={"processed": checkpoint.processed, "failures": len(self.failures)},
        )

    def _generate_batches(self, start_after: str | None) -> Iterable[list[str]]:
        current = int(start_after or 0)
        while current < 5000:
            batch = [str(i) for i in range(current + 1, current + 1 + self.batch_size)]
            yield batch
            current += self.batch_size

    def _apply_batch(self, batch: list[str]) -> None:
        for record_id in batch:
            try:
                self._dual_write(record_id)
            except Exception as exc:  # pragma: no cover
                logger.error(
                    "dual-write-failure", extra={"record_id": record_id, "error": str(exc)}
                )
                self.failures.append(record_id)

    def _dual_write(self, record_id: str) -> None:
        shadow_enabled = os.environ.get("DB_DUAL_WRITE", "true").lower() == "true"
        if not shadow_enabled:
            return
        logger.info("dual-write", extra={"record_id": record_id, "shadow": True})

    def _rate_limit_delay(self) -> float:
        rps = float(os.environ.get(self.rps_flag.replace(".", "_"), "50"))
        return max(0.0, 1.0 / rps)


if __name__ == "__main__":
    BackfillWorker().run()
