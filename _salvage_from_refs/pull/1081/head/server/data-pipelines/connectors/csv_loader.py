"""
CSV Data Connector for IntelGraph
Handles CSV file ingestion from local and remote sources
"""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import aiohttp
import chardet
import pandas as pd

from .base import BaseConnector


class CSVConnector(BaseConnector):
    """
    Connector for CSV data sources
    Supports local files, HTTP URLs, and FTP sources
    """

    def __init__(self, name: str, config: dict[str, Any]):
        super().__init__(name, config)

        # CSV-specific configuration
        self.file_path = config.get("file_path")
        self.url = config.get("url")
        self.delimiter = config.get("delimiter", ",")
        self.encoding = config.get("encoding", "utf-8")
        self.skip_rows = config.get("skip_rows", 0)
        self.has_header = config.get("has_header", True)
        self.chunk_size = config.get("chunk_size", 10000)

        # HTTP configuration for remote files
        self.headers = config.get("headers", {})
        self.auth = config.get("auth")

        # Data type inference
        self.infer_types = config.get("infer_types", True)
        self.date_columns = config.get("date_columns", [])

        self._session: aiohttp.ClientSession | None = None
        self._file_handle = None

    async def connect(self) -> bool:
        """
        Establish connection to the CSV source
        """
        try:
            if self.url:
                # Remote CSV file
                self._session = aiohttp.ClientSession()
                await self.test_connection()

            elif self.file_path:
                # Local CSV file
                path = Path(self.file_path)
                if not path.exists():
                    raise FileNotFoundError(f"CSV file not found: {self.file_path}")

                # Detect encoding if not specified
                if self.encoding == "auto":
                    with open(path, "rb") as f:
                        raw_data = f.read(10000)
                        detection = chardet.detect(raw_data)
                        self.encoding = detection.get("encoding", "utf-8")
                        self.logger.info(f"Detected encoding: {self.encoding}")

            else:
                raise ValueError("Either 'file_path' or 'url' must be specified")

            self.logger.info(f"Connected to CSV source: {self.file_path or self.url}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to connect to CSV source: {e}")
            return False

    async def disconnect(self) -> None:
        """
        Close connection to the CSV source
        """
        if self._session:
            await self._session.close()
            self._session = None

        if self._file_handle:
            self._file_handle.close()
            self._file_handle = None

    async def test_connection(self) -> bool:
        """
        Test if CSV source is accessible
        """
        try:
            if self.url:
                # Test HTTP connection
                async with self._session.head(self.url, headers=self.headers) as response:
                    return response.status == 200

            elif self.file_path:
                # Test local file access
                path = Path(self.file_path)
                return path.exists() and path.is_file()

            return False

        except Exception as e:
            self.logger.error(f"Connection test failed: {e}")
            return False

    async def extract_data(self, **kwargs) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data from CSV source
        Yields individual records as dictionaries
        """
        try:
            if self.url:
                # Extract from remote CSV
                async for record in self._extract_from_url():
                    yield record
            else:
                # Extract from local CSV
                async for record in self._extract_from_file():
                    yield record

        except Exception as e:
            self.logger.error(f"Data extraction failed: {e}")
            raise

    async def _extract_from_url(self) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data from remote CSV URL
        """
        try:
            async with self._session.get(self.url, headers=self.headers) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {response.reason}")

                # Read content in chunks to handle large files
                content = await response.read()

                # Decode content
                text_content = content.decode(self.encoding)

                # Parse CSV using pandas for better type inference
                from io import StringIO

                df = pd.read_csv(
                    StringIO(text_content),
                    delimiter=self.delimiter,
                    skiprows=self.skip_rows,
                    encoding=self.encoding,
                    chunksize=self.chunk_size,
                    parse_dates=self.date_columns if self.date_columns else False,
                    infer_datetime_format=True if self.date_columns else False,
                )

                for chunk in df:
                    for _, row in chunk.iterrows():
                        record = row.to_dict()
                        # Convert NaN values to None
                        record = {k: (None if pd.isna(v) else v) for k, v in record.items()}
                        yield record

        except Exception as e:
            self.logger.error(f"Failed to extract from URL {self.url}: {e}")
            raise

    async def _extract_from_file(self) -> AsyncIterator[dict[str, Any]]:
        """
        Extract data from local CSV file
        """
        try:
            # Use pandas for efficient processing
            df_chunks = pd.read_csv(
                self.file_path,
                delimiter=self.delimiter,
                skiprows=self.skip_rows,
                encoding=self.encoding,
                chunksize=self.chunk_size,
                parse_dates=self.date_columns if self.date_columns else False,
                infer_datetime_format=True if self.date_columns else False,
            )

            for chunk in df_chunks:
                for _, row in chunk.iterrows():
                    record = row.to_dict()
                    # Convert NaN values to None
                    record = {k: (None if pd.isna(v) else v) for k, v in record.items()}
                    yield record

        except Exception as e:
            self.logger.error(f"Failed to extract from file {self.file_path}: {e}")
            raise

    async def get_metadata(self) -> dict[str, Any]:
        """
        Get metadata about the CSV source
        """
        metadata = {
            "connector_type": "csv",
            "source": self.file_path or self.url,
            "delimiter": self.delimiter,
            "encoding": self.encoding,
            "has_header": self.has_header,
        }

        try:
            if self.file_path:
                # Get file statistics
                path = Path(self.file_path)
                stat = path.stat()
                metadata.update({"file_size_bytes": stat.st_size, "modified_time": stat.st_mtime})

                # Get column information by reading first few rows
                sample_df = pd.read_csv(
                    self.file_path,
                    delimiter=self.delimiter,
                    skiprows=self.skip_rows,
                    encoding=self.encoding,
                    nrows=100,  # Sample first 100 rows
                )

                metadata.update(
                    {
                        "columns": list(sample_df.columns),
                        "estimated_rows": self._estimate_row_count(),
                        "data_types": sample_df.dtypes.to_dict(),
                    }
                )

            elif self.url:
                # Get URL metadata
                async with self._session.head(self.url, headers=self.headers) as response:
                    metadata.update(
                        {
                            "content_length": response.headers.get("content-length"),
                            "content_type": response.headers.get("content-type"),
                            "last_modified": response.headers.get("last-modified"),
                        }
                    )

        except Exception as e:
            self.logger.warning(f"Could not get complete metadata: {e}")

        return metadata

    def _estimate_row_count(self) -> int | None:
        """
        Estimate total row count for large files
        """
        try:
            if not self.file_path:
                return None

            path = Path(self.file_path)
            file_size = path.stat().st_size

            # Sample first 1000 rows to estimate average row size
            sample_df = pd.read_csv(
                self.file_path,
                delimiter=self.delimiter,
                skiprows=self.skip_rows,
                encoding=self.encoding,
                nrows=1000,
            )

            if len(sample_df) == 0:
                return 0

            # Read the same sample as text to get byte size
            with open(path, encoding=self.encoding) as f:
                # Skip rows
                for _ in range(self.skip_rows):
                    f.readline()

                # Read sample rows
                sample_text = ""
                for _ in range(min(1000, len(sample_df))):
                    line = f.readline()
                    if not line:
                        break
                    sample_text += line

                if sample_text:
                    avg_bytes_per_row = len(sample_text.encode(self.encoding)) / len(sample_df)
                    estimated_rows = int(file_size / avg_bytes_per_row)
                    return estimated_rows

        except Exception as e:
            self.logger.warning(f"Could not estimate row count: {e}")

        return None

    async def validate_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """
        Validate CSV record with additional checks
        """
        # Call parent validation
        record = await super().validate_record(record)

        # CSV-specific validation
        if not isinstance(record, dict):
            raise ValueError("Record must be a dictionary")

        # Remove empty string values and replace with None
        for key, value in record.items():
            if value == "":
                record[key] = None

        return record
