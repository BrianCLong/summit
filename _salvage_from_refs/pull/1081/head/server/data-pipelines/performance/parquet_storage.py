"""
Parquet Storage for High-Performance Analytics
Optimized columnar storage with compression and partitioning
"""

import hashlib
from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from typing import Any

try:
    import pandas as pd
    import pyarrow as pa
    import pyarrow.compute as pc
    import pyarrow.parquet as pq

    ARROW_AVAILABLE = True
except ImportError:
    ARROW_AVAILABLE = False

from ..utils.logging import get_logger


class CompressionType(Enum):
    """Supported compression types for Parquet"""

    SNAPPY = "snappy"
    GZIP = "gzip"
    BROTLI = "brotli"
    LZ4 = "lz4"
    ZSTD = "zstd"


@dataclass
class ParquetConfig:
    """Configuration for Parquet storage"""

    # Storage settings
    storage_path: str = "./data/parquet"

    # Compression settings
    compression: CompressionType = CompressionType.SNAPPY
    compression_level: int | None = None

    # File organization
    max_file_size_mb: int = 256  # Target file size in MB
    max_rows_per_file: int = 1_000_000
    partition_columns: list[str] | None = None

    # Schema settings
    schema_validation: bool = True
    allow_schema_evolution: bool = True

    # Performance settings
    row_group_size: int = 100_000
    page_size: int = 1024 * 1024  # 1MB pages

    # Indexing
    create_indexes: bool = True
    bloom_filter_columns: list[str] | None = None

    # Metadata
    include_metadata: bool = True
    metadata_columns: list[str] = None

    def __post_init__(self):
        if self.metadata_columns is None:
            self.metadata_columns = ["_created_at", "_updated_at", "_batch_id", "_source"]


@dataclass
class StorageStats:
    """Statistics for Parquet storage operations"""

    files_written: int = 0
    rows_written: int = 0
    bytes_written: int = 0
    compression_ratio: float = 0.0
    write_time_seconds: float = 0.0
    partitions_created: int = 0


class ParquetStorage:
    """
    High-performance Parquet storage with optimization features
    """

    def __init__(self, config: ParquetConfig = None):
        if not ARROW_AVAILABLE:
            raise ImportError(
                "pyarrow is required for Parquet storage. Install with: pip install pyarrow"
            )

        self.config = config or ParquetConfig()
        self.logger = get_logger("parquet-storage")

        # Ensure storage directory exists
        self.storage_path = Path(self.config.storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        # Schema registry for validation
        self.schemas: dict[str, pa.Schema] = {}
        self.schema_versions: dict[str, int] = {}

        # Statistics tracking
        self.stats = StorageStats()

    def write_dataframe(
        self,
        df: "pd.DataFrame",
        table_name: str,
        partition_values: dict[str, Any] | None = None,
        batch_id: str | None = None,
    ) -> StorageStats:
        """
        Write pandas DataFrame to Parquet with optimizations

        Args:
            df: DataFrame to write
            table_name: Name of the table/dataset
            partition_values: Values for partitioning columns
            batch_id: Unique identifier for this batch

        Returns:
            StorageStats with operation metrics
        """
        start_time = datetime.now()

        # Add metadata columns
        df_with_metadata = self._add_metadata_columns(df, batch_id)

        # Convert to Arrow table
        arrow_table = pa.Table.from_pandas(df_with_metadata)

        # Validate or evolve schema
        arrow_table = self._handle_schema(table_name, arrow_table)

        # Determine file path
        file_path = self._get_file_path(table_name, partition_values, batch_id)

        # Write with optimizations
        stats = self._write_arrow_table(arrow_table, file_path)

        # Update statistics
        end_time = datetime.now()
        stats.write_time_seconds = (end_time - start_time).total_seconds()

        self.logger.info(
            f"Wrote {stats.rows_written} rows to {file_path} "
            f"({stats.bytes_written / 1024 / 1024:.1f} MB) "
            f"in {stats.write_time_seconds:.2f}s"
        )

        return stats

    def write_records(
        self,
        records: list[dict[str, Any]],
        table_name: str,
        partition_values: dict[str, Any] | None = None,
        batch_id: str | None = None,
    ) -> StorageStats:
        """
        Write list of records to Parquet

        Args:
            records: List of record dictionaries
            table_name: Name of the table/dataset
            partition_values: Values for partitioning columns
            batch_id: Unique identifier for this batch

        Returns:
            StorageStats with operation metrics
        """
        # Convert records to DataFrame
        df = pd.DataFrame(records)

        return self.write_dataframe(df, table_name, partition_values, batch_id)

    def read_table(
        self,
        table_name: str,
        filters: list[tuple] | None = None,
        columns: list[str] | None = None,
        partition_values: dict[str, Any] | None = None,
    ) -> "pd.DataFrame":
        """
        Read Parquet table with filters and column selection

        Args:
            table_name: Name of the table to read
            filters: PyArrow filters for row selection
            columns: List of columns to read (None for all)
            partition_values: Partition values to filter by

        Returns:
            DataFrame with requested data
        """
        table_path = self.storage_path / table_name

        if not table_path.exists():
            raise FileNotFoundError(f"Table {table_name} not found at {table_path}")

        try:
            # Read as Arrow table first for efficient filtering
            arrow_table = pq.read_table(table_path, filters=filters, columns=columns)

            # Convert to pandas
            df = arrow_table.to_pandas()

            self.logger.debug(f"Read {len(df)} rows from {table_name}")
            return df

        except Exception as e:
            self.logger.error(f"Failed to read table {table_name}: {e}")
            raise

    def query_table(
        self, table_name: str, query: str, use_legacy_dataset: bool = False
    ) -> "pd.DataFrame":
        """
        Query Parquet table using SQL-like syntax

        Args:
            table_name: Name of the table to query
            query: SQL query string
            use_legacy_dataset: Use legacy dataset API for compatibility

        Returns:
            DataFrame with query results
        """
        table_path = self.storage_path / table_name

        if not table_path.exists():
            raise FileNotFoundError(f"Table {table_name} not found")

        try:
            # Load table
            dataset = pq.ParquetDataset(table_path, use_legacy_dataset=use_legacy_dataset)
            arrow_table = dataset.read()

            # Execute query using compute functions
            # This is a simplified query executor - for production, consider DuckDB integration
            result_table = self._execute_simple_query(arrow_table, query)

            return result_table.to_pandas()

        except Exception as e:
            self.logger.error(f"Query failed for table {table_name}: {e}")
            raise

    def get_table_schema(self, table_name: str) -> pa.Schema:
        """Get schema for a table"""
        if table_name in self.schemas:
            return self.schemas[table_name]

        table_path = self.storage_path / table_name
        if table_path.exists():
            # Read schema from existing files
            schema = pq.read_schema(table_path)
            self.schemas[table_name] = schema
            return schema

        raise FileNotFoundError(f"No schema found for table {table_name}")

    def get_table_stats(self, table_name: str) -> dict[str, Any]:
        """Get statistics for a table"""
        table_path = self.storage_path / table_name

        if not table_path.exists():
            raise FileNotFoundError(f"Table {table_name} not found")

        try:
            # Get file-level stats
            dataset = pq.ParquetDataset(table_path)
            total_rows = 0
            total_size = 0
            file_count = 0

            for piece in dataset.pieces:
                metadata = piece.get_metadata()
                total_rows += metadata.num_rows
                total_size += metadata.serialized_size
                file_count += 1

            schema = dataset.schema

            return {
                "table_name": table_name,
                "total_rows": total_rows,
                "total_size_bytes": total_size,
                "total_size_mb": total_size / 1024 / 1024,
                "file_count": file_count,
                "schema": str(schema),
                "columns": schema.names,
                "compression": self.config.compression.value,
                "created_at": datetime.now().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Failed to get stats for table {table_name}: {e}")
            raise

    def compact_table(self, table_name: str, target_file_size_mb: int = 256) -> StorageStats:
        """
        Compact table files to optimize read performance

        Args:
            table_name: Table to compact
            target_file_size_mb: Target size for compacted files

        Returns:
            StorageStats with compaction metrics
        """
        table_path = self.storage_path / table_name

        if not table_path.exists():
            raise FileNotFoundError(f"Table {table_name} not found")

        self.logger.info(f"Starting compaction for table {table_name}")
        start_time = datetime.now()

        try:
            # Read entire table
            dataset = pq.ParquetDataset(table_path)
            arrow_table = dataset.read()

            # Create backup
            backup_path = table_path.with_suffix(".backup")
            if backup_path.exists():
                import shutil

                shutil.rmtree(backup_path)
            table_path.rename(backup_path)

            # Write compacted version
            target_rows = int(
                target_file_size_mb * 1024 * 1024 / self._estimate_row_size(arrow_table)
            )

            stats = StorageStats()
            table_path.mkdir(parents=True, exist_ok=True)

            # Write in chunks
            for i in range(0, len(arrow_table), target_rows):
                chunk = arrow_table.slice(i, target_rows)
                chunk_path = table_path / f"part_{i//target_rows:04d}.parquet"

                chunk_stats = self._write_arrow_table(chunk, chunk_path)
                stats.files_written += chunk_stats.files_written
                stats.rows_written += chunk_stats.rows_written
                stats.bytes_written += chunk_stats.bytes_written

            # Clean up backup on success
            import shutil

            shutil.rmtree(backup_path)

            end_time = datetime.now()
            stats.write_time_seconds = (end_time - start_time).total_seconds()

            self.logger.info(
                f"Compacted table {table_name}: {stats.files_written} files, "
                f"{stats.rows_written} rows in {stats.write_time_seconds:.2f}s"
            )

            return stats

        except Exception as e:
            self.logger.error(f"Compaction failed for table {table_name}: {e}")
            # Restore backup if it exists
            backup_path = table_path.with_suffix(".backup")
            if backup_path.exists():
                if table_path.exists():
                    import shutil

                    shutil.rmtree(table_path)
                backup_path.rename(table_path)
            raise

    def _add_metadata_columns(self, df: "pd.DataFrame", batch_id: str | None) -> "pd.DataFrame":
        """Add metadata columns to DataFrame"""
        df_copy = df.copy()

        current_time = datetime.now()

        for col in self.config.metadata_columns:
            if col == "_created_at" or col == "_updated_at":
                df_copy[col] = current_time
            elif col == "_batch_id":
                df_copy[col] = batch_id or self._generate_batch_id()
            elif col == "_source":
                df_copy[col] = "parquet_storage"

        return df_copy

    def _generate_batch_id(self) -> str:
        """Generate unique batch ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        hash_part = hashlib.md5(str(datetime.now().timestamp()).encode()).hexdigest()[:8]
        return f"batch_{timestamp}_{hash_part}"

    def _handle_schema(self, table_name: str, arrow_table: pa.Table) -> pa.Table:
        """Handle schema validation and evolution"""

        if table_name not in self.schemas:
            # First write - store schema
            self.schemas[table_name] = arrow_table.schema
            self.schema_versions[table_name] = 1
            self.logger.info(f"Created new schema for table {table_name}")
            return arrow_table

        existing_schema = self.schemas[table_name]

        if arrow_table.schema.equals(existing_schema):
            # Schema matches
            return arrow_table

        if not self.config.allow_schema_evolution:
            raise ValueError(f"Schema mismatch for table {table_name} and evolution is disabled")

        # Handle schema evolution
        evolved_table = self._evolve_schema(arrow_table, existing_schema)

        # Update stored schema
        self.schemas[table_name] = evolved_table.schema
        self.schema_versions[table_name] += 1

        self.logger.info(
            f"Evolved schema for table {table_name} to version {self.schema_versions[table_name]}"
        )

        return evolved_table

    def _evolve_schema(self, new_table: pa.Table, existing_schema: pa.Schema) -> pa.Table:
        """Evolve table schema to be compatible with existing schema"""

        # Get unified schema
        unified_fields = {}

        # Add existing fields
        for field in existing_schema:
            unified_fields[field.name] = field

        # Add new fields
        for field in new_table.schema:
            if field.name not in unified_fields:
                unified_fields[field.name] = field
                self.logger.info(f"Adding new column: {field.name} ({field.type})")

        # Create unified schema
        unified_schema = pa.schema(list(unified_fields.values()))

        # Cast table to unified schema
        try:
            # Add missing columns with null values
            table_dict = {}
            for field in unified_schema:
                if field.name in new_table.column_names:
                    table_dict[field.name] = new_table[field.name]
                else:
                    # Add null column
                    null_array = pa.nulls(len(new_table), field.type)
                    table_dict[field.name] = null_array

            evolved_table = pa.table(table_dict, schema=unified_schema)
            return evolved_table

        except Exception as e:
            self.logger.error(f"Schema evolution failed: {e}")
            raise

    def _get_file_path(
        self, table_name: str, partition_values: dict[str, Any] | None, batch_id: str | None
    ) -> Path:
        """Generate file path with partitioning"""

        base_path = self.storage_path / table_name

        # Add partition directories
        if partition_values and self.config.partition_columns:
            for col in self.config.partition_columns:
                if col in partition_values:
                    value = partition_values[col]
                    # Handle date partitioning
                    if isinstance(value, (date, datetime)):
                        value = value.strftime("%Y-%m-%d")
                    base_path = base_path / f"{col}={value}"

        # Ensure directory exists
        base_path.mkdir(parents=True, exist_ok=True)

        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # milliseconds
        batch_suffix = f"_{batch_id}" if batch_id else ""
        filename = f"data_{timestamp}{batch_suffix}.parquet"

        return base_path / filename

    def _write_arrow_table(self, arrow_table: pa.Table, file_path: Path) -> StorageStats:
        """Write Arrow table to Parquet with optimizations"""

        # Calculate uncompressed size estimate
        uncompressed_size = self._estimate_table_size(arrow_table)

        # Write with optimizations
        pq.write_table(
            arrow_table,
            file_path,
            compression=self.config.compression.value,
            compression_level=self.config.compression_level,
            row_group_size=self.config.row_group_size,
            data_page_size=self.config.page_size,
            write_statistics=True,
            use_dictionary=True,
            column_encoding=self._get_column_encodings(arrow_table.schema),
        )

        # Get actual file size
        actual_size = file_path.stat().st_size
        compression_ratio = uncompressed_size / actual_size if actual_size > 0 else 0

        return StorageStats(
            files_written=1,
            rows_written=len(arrow_table),
            bytes_written=actual_size,
            compression_ratio=compression_ratio,
            partitions_created=1 if self.config.partition_columns else 0,
        )

    def _estimate_table_size(self, arrow_table: pa.Table) -> int:
        """Estimate uncompressed table size"""
        total_size = 0

        for column in arrow_table.columns:
            # Rough estimate based on Arrow array size
            total_size += len(column) * self._estimate_value_size(column.type)

        return total_size

    def _estimate_value_size(self, arrow_type: pa.DataType) -> int:
        """Estimate average size of values for a given type"""
        if pa.types.is_integer(arrow_type) or pa.types.is_floating(arrow_type):
            return 8
        elif pa.types.is_boolean(arrow_type):
            return 1
        elif pa.types.is_string(arrow_type) or pa.types.is_large_string(arrow_type):
            return 50  # Average string length estimate
        elif pa.types.is_timestamp(arrow_type):
            return 8
        else:
            return 20  # Default estimate

    def _estimate_row_size(self, arrow_table: pa.Table) -> float:
        """Estimate average row size in bytes"""
        if len(arrow_table) == 0:
            return 100  # Default estimate

        total_size = self._estimate_table_size(arrow_table)
        return total_size / len(arrow_table)

    def _get_column_encodings(self, schema: pa.Schema) -> dict[str, str]:
        """Get optimal column encodings based on data types"""
        encodings = {}

        for field in schema:
            if pa.types.is_integer(field.type):
                encodings[field.name] = "DELTA_BINARY_PACKED"
            elif pa.types.is_string(field.type):
                encodings[field.name] = "DELTA_BYTE_ARRAY"
            elif pa.types.is_timestamp(field.type):
                encodings[field.name] = "DELTA_BINARY_PACKED"
            else:
                encodings[field.name] = "PLAIN"

        return encodings

    def _execute_simple_query(self, arrow_table: pa.Table, query: str) -> pa.Table:
        """Execute simple SQL-like queries using Arrow compute"""

        # This is a simplified query executor
        # For production use, integrate with DuckDB or similar SQL engine

        query_lower = query.lower().strip()

        if query_lower.startswith("select"):
            # Parse simple SELECT queries
            parts = query_lower.split()

            if "from" in parts:
                from_idx = parts.index("from")
                select_part = " ".join(parts[1:from_idx])

                # Handle column selection
                if select_part.strip() == "*":
                    selected_table = arrow_table
                else:
                    # Parse column names
                    columns = [col.strip() for col in select_part.split(",")]
                    selected_table = arrow_table.select(columns)

                # Handle WHERE clause (basic)
                if "where" in parts:
                    where_idx = parts.index("where")
                    # Simple filter implementation would go here
                    # For now, return the selected table
                    pass

                return selected_table

        # Default: return original table
        return arrow_table

    def optimize_for_analytics(self, table_name: str) -> dict[str, Any]:
        """Optimize table structure for analytical queries"""

        table_path = self.storage_path / table_name
        if not table_path.exists():
            raise FileNotFoundError(f"Table {table_name} not found")

        self.logger.info(f"Optimizing table {table_name} for analytics")

        # Read table
        arrow_table = pq.read_table(table_path)

        # Analyze column statistics
        column_stats = {}
        for i, column_name in enumerate(arrow_table.column_names):
            column = arrow_table.column(i)
            column_stats[column_name] = {
                "type": str(column.type),
                "null_count": pc.count(column, mode="only_null").as_py(),
                "distinct_count": len(pc.unique(column)),
                "total_count": len(column),
            }

        # Suggest optimizations
        optimizations = {
            "table_name": table_name,
            "current_files": len(list(table_path.glob("*.parquet"))),
            "total_rows": len(arrow_table),
            "column_stats": column_stats,
            "suggestions": [],
        }

        # Suggest dictionary encoding for high-cardinality string columns
        for col_name, stats in column_stats.items():
            if "string" in stats["type"].lower():
                cardinality_ratio = stats["distinct_count"] / stats["total_count"]
                if cardinality_ratio < 0.5:  # Less than 50% unique values
                    optimizations["suggestions"].append(
                        {
                            "type": "dictionary_encoding",
                            "column": col_name,
                            "reason": f"High repetition rate ({cardinality_ratio:.2%})",
                        }
                    )

        # Suggest partitioning for large tables
        if len(arrow_table) > 1_000_000:
            date_columns = [
                name
                for name, stats in column_stats.items()
                if "timestamp" in stats["type"].lower() or "date" in stats["type"].lower()
            ]
            if date_columns:
                optimizations["suggestions"].append(
                    {
                        "type": "partitioning",
                        "columns": date_columns,
                        "reason": "Large table with date/time columns",
                    }
                )

        return optimizations


# Utility functions for Parquet operations
def merge_parquet_files(
    input_paths: list[Path],
    output_path: Path,
    compression: CompressionType = CompressionType.SNAPPY,
) -> StorageStats:
    """Merge multiple Parquet files into one"""

    if not ARROW_AVAILABLE:
        raise ImportError("pyarrow is required")

    logger = get_logger("parquet-merge")
    start_time = datetime.now()

    # Read all tables
    tables = []
    total_rows = 0

    for path in input_paths:
        if path.exists():
            table = pq.read_table(path)
            tables.append(table)
            total_rows += len(table)
            logger.debug(f"Read {len(table)} rows from {path}")

    if not tables:
        raise ValueError("No valid input files found")

    # Concatenate tables
    merged_table = pa.concat_tables(tables)

    # Write merged table
    pq.write_table(merged_table, output_path, compression=compression.value, write_statistics=True)

    # Calculate stats
    end_time = datetime.now()
    output_size = output_path.stat().st_size

    logger.info(f"Merged {len(input_paths)} files into {output_path} ({total_rows} rows)")

    return StorageStats(
        files_written=1,
        rows_written=total_rows,
        bytes_written=output_size,
        write_time_seconds=(end_time - start_time).total_seconds(),
    )


def convert_csv_to_parquet(
    csv_path: Path,
    parquet_path: Path,
    chunk_size: int = 100_000,
    compression: CompressionType = CompressionType.SNAPPY,
) -> StorageStats:
    """Convert CSV file to optimized Parquet format"""

    if not ARROW_AVAILABLE:
        raise ImportError("pyarrow is required")

    logger = get_logger("csv-to-parquet")
    start_time = datetime.now()

    total_rows = 0
    tables = []

    # Read CSV in chunks
    for chunk_df in pd.read_csv(csv_path, chunksize=chunk_size):
        chunk_table = pa.Table.from_pandas(chunk_df)
        tables.append(chunk_table)
        total_rows += len(chunk_df)
        logger.debug(f"Processed chunk: {len(chunk_df)} rows")

    # Concatenate all chunks
    full_table = pa.concat_tables(tables)

    # Write to Parquet
    pq.write_table(full_table, parquet_path, compression=compression.value, write_statistics=True)

    # Calculate stats
    end_time = datetime.now()
    output_size = parquet_path.stat().st_size
    input_size = csv_path.stat().st_size
    compression_ratio = input_size / output_size if output_size > 0 else 0

    logger.info(
        f"Converted {csv_path} to {parquet_path}: "
        f"{total_rows} rows, {compression_ratio:.1f}x compression"
    )

    return StorageStats(
        files_written=1,
        rows_written=total_rows,
        bytes_written=output_size,
        compression_ratio=compression_ratio,
        write_time_seconds=(end_time - start_time).total_seconds(),
    )
