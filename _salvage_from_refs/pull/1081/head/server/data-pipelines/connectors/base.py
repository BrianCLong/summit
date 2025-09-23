"""
Base Connector Class for IntelGraph Data Ingestion
Defines the interface and common functionality for all data connectors
"""

import logging
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class ConnectorStatus(Enum):
    """Status of a connector"""

    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class IngestionStats:
    """Statistics for an ingestion run"""

    start_time: datetime
    end_time: datetime | None = None
    records_processed: int = 0
    records_success: int = 0
    records_failed: int = 0
    bytes_processed: int = 0
    errors: list[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []

    @property
    def duration_seconds(self) -> float | None:
        if self.end_time and self.start_time:
            return (self.end_time - self.start_time).total_seconds()
        return None

    @property
    def success_rate(self) -> float:
        if self.records_processed == 0:
            return 0.0
        return self.records_success / self.records_processed


class BaseConnector(ABC):
    """
    Base class for all data connectors
    Provides common functionality and interface for data ingestion
    """

    def __init__(self, name: str, config: dict[str, Any]):
        self.name = name
        self.config = config
        self.status = ConnectorStatus.IDLE
        self.stats = None
        self.logger = logging.getLogger(f"connector.{name}")

    @abstractmethod
    async def connect(self) -> bool:
        """
        Establish connection to the data source
        Returns True if successful, False otherwise
        """
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """
        Close connection to the data source
        """
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """
        Test if connection to data source is working
        Returns True if successful, False otherwise
        """
        pass

    @abstractmethod
    async def extract_data(self, **kwargs) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data from the source
        Yields individual records as dictionaries
        """
        pass

    @abstractmethod
    async def get_metadata(self) -> dict[str, Any]:
        """
        Get metadata about the data source
        Returns information like schema, record counts, etc.
        """
        pass

    async def ingest(
        self, batch_size: int = 1000, output_path: Path | None = None, **extract_kwargs
    ) -> IngestionStats:
        """
        Main ingestion method that orchestrates the data extraction process
        """
        self.logger.info(f"Starting ingestion for connector {self.name}")
        self.status = ConnectorStatus.RUNNING

        stats = IngestionStats(start_time=datetime.now())
        self.stats = stats

        try:
            # Connect to data source
            if not await self.connect():
                raise Exception(f"Failed to connect to data source {self.name}")

            # Extract and process data
            batch = []
            async for record in self.extract_data(**extract_kwargs):
                try:
                    # Validate record
                    validated_record = await self.validate_record(record)
                    batch.append(validated_record)
                    stats.records_processed += 1

                    # Process batch when full
                    if len(batch) >= batch_size:
                        await self.process_batch(batch, output_path)
                        stats.records_success += len(batch)
                        batch = []

                except Exception as e:
                    stats.records_failed += 1
                    stats.errors.append(f"Record processing error: {str(e)}")
                    self.logger.error(f"Failed to process record: {e}")

            # Process remaining records
            if batch:
                await self.process_batch(batch, output_path)
                stats.records_success += len(batch)

            self.status = ConnectorStatus.SUCCESS

        except Exception as e:
            self.status = ConnectorStatus.FAILED
            stats.errors.append(f"Ingestion error: {str(e)}")
            self.logger.error(f"Ingestion failed for {self.name}: {e}")
            raise

        finally:
            await self.disconnect()
            stats.end_time = datetime.now()

        self.logger.info(
            f"Ingestion completed for {self.name}. "
            f"Processed: {stats.records_processed}, "
            f"Success: {stats.records_success}, "
            f"Failed: {stats.records_failed}, "
            f"Duration: {stats.duration_seconds:.2f}s"
        )

        return stats

    async def validate_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """
        Validate a single record
        Override in subclasses for specific validation logic
        """
        # Basic validation - ensure record is not empty
        if not record:
            raise ValueError("Empty record")

        # Add ingestion metadata
        record["_ingestion"] = {
            "source": self.name,
            "timestamp": datetime.now().isoformat(),
            "connector_type": self.__class__.__name__,
        }

        return record

    async def process_batch(
        self, batch: list[dict[str, Any]], output_path: Path | None = None
    ) -> None:
        """
        Process a batch of records
        Override in subclasses for specific processing logic
        """
        if output_path:
            # Save to staging area
            await self.save_batch_to_staging(batch, output_path)
        else:
            # Default: log the batch size
            self.logger.info(f"Processed batch of {len(batch)} records")

    async def save_batch_to_staging(self, batch: list[dict[str, Any]], output_path: Path) -> None:
        """
        Save batch to staging area as JSON
        """
        import json

        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Generate unique filename for this batch
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        batch_file = output_path / f"{self.name}_{timestamp}.json"

        with open(batch_file, "w") as f:
            json.dump(batch, f, indent=2, default=str)

        self.logger.debug(f"Saved batch to {batch_file}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def retry_operation(self, operation, *args, **kwargs):
        """
        Retry wrapper for operations that might fail temporarily
        """
        try:
            return await operation(*args, **kwargs)
        except Exception as e:
            self.logger.warning(f"Operation failed, will retry: {e}")
            raise

    def get_status(self) -> dict[str, Any]:
        """
        Get current status of the connector
        """
        return {
            "name": self.name,
            "status": self.status.value,
            "stats": self.stats.__dict__ if self.stats else None,
            "config": {
                k: (
                    "***"
                    if "password" in k.lower() or "secret" in k.lower() or "key" in k.lower()
                    else v
                )
                for k, v in self.config.items()
            },
        }

    def __str__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name}, status={self.status.value})"
