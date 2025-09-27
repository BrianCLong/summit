"""
Columnar Analytics and Query Optimization
High-performance analytics on Parquet data with query optimization
"""

import re
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any

try:
    import pandas as pd
    import pyarrow as pa
    import pyarrow.compute as pc
    import pyarrow.dataset as ds
    import pyarrow.parquet as pq

    ARROW_AVAILABLE = True
except ImportError:
    ARROW_AVAILABLE = False

try:
    import duckdb

    DUCKDB_AVAILABLE = True
except ImportError:
    DUCKDB_AVAILABLE = False

from ..utils.logging import get_logger
from .caching import CacheManager
from .parquet_storage import ParquetStorage


class QueryType(Enum):
    """Types of analytical queries"""

    AGGREGATION = "aggregation"
    FILTER = "filter"
    JOIN = "join"
    WINDOW = "window"
    GROUPBY = "groupby"
    SORT = "sort"


class OptimizationTechnique(Enum):
    """Query optimization techniques"""

    PREDICATE_PUSHDOWN = "predicate_pushdown"
    PROJECTION_PUSHDOWN = "projection_pushdown"
    PARTITION_PRUNING = "partition_pruning"
    COLUMNAR_SCAN = "columnar_scan"
    VECTORIZATION = "vectorization"
    CACHING = "caching"


@dataclass
class QueryPlan:
    """Execution plan for a query"""

    query_id: str
    query_type: QueryType
    estimated_cost: float
    estimated_rows: int
    optimizations: list[OptimizationTechnique]
    execution_steps: list[str]
    cache_eligible: bool = True
    parallel_eligible: bool = True


@dataclass
class QueryStats:
    """Statistics for query execution"""

    query_id: str
    execution_time_ms: float
    rows_processed: int
    rows_returned: int
    bytes_scanned: int
    cache_hit: bool = False
    optimizations_applied: list[OptimizationTechnique] = None

    def __post_init__(self):
        if self.optimizations_applied is None:
            self.optimizations_applied = []


class ColumnarAnalytics:
    """
    High-performance columnar analytics engine
    """

    def __init__(
        self,
        parquet_storage: ParquetStorage,
        cache_manager: CacheManager | None = None,
        enable_duckdb: bool = True,
    ):
        if not ARROW_AVAILABLE:
            raise ImportError("pyarrow is required for columnar analytics")

        self.storage = parquet_storage
        self.cache_manager = cache_manager
        self.enable_duckdb = enable_duckdb and DUCKDB_AVAILABLE
        self.logger = get_logger("columnar-analytics")

        # Query optimizer
        self.optimizer = QueryOptimizer(self.storage, cache_manager)

        # DuckDB connection for complex queries
        if self.enable_duckdb:
            self.duckdb_conn = duckdb.connect()
            self.logger.info("DuckDB integration enabled")
        else:
            self.duckdb_conn = None

        # Query execution statistics
        self.query_stats: list[QueryStats] = []
        self.query_cache_ttl = 3600  # 1 hour default

    def execute_sql(
        self, query: str, table_name: str, use_cache: bool = True, cache_ttl: int | None = None
    ) -> pd.DataFrame:
        """
        Execute SQL query on Parquet data

        Args:
            query: SQL query string
            table_name: Name of the table to query
            use_cache: Whether to use query result caching
            cache_ttl: Cache TTL in seconds

        Returns:
            DataFrame with query results
        """
        start_time = time.time()
        query_id = self._generate_query_id(query, table_name)

        # Check cache first
        if use_cache and self.cache_manager:
            cache_key = f"query:{query_id}"
            cached_result = self.cache_manager.get(cache_key)
            if cached_result is not None:
                self.logger.debug(f"Query cache hit for {query_id}")

                # Record cache hit stats
                stats = QueryStats(
                    query_id=query_id,
                    execution_time_ms=(time.time() - start_time) * 1000,
                    rows_processed=0,
                    rows_returned=len(cached_result),
                    bytes_scanned=0,
                    cache_hit=True,
                )
                self.query_stats.append(stats)

                return cached_result

        try:
            # Get query plan and optimize
            plan = self.optimizer.create_plan(query, table_name)

            # Execute query
            if self.enable_duckdb:
                result_df = self._execute_with_duckdb(query, table_name, plan)
            else:
                result_df = self._execute_with_arrow(query, table_name, plan)

            # Cache result if enabled
            if use_cache and self.cache_manager and plan.cache_eligible:
                cache_key = f"query:{query_id}"
                ttl = cache_ttl or self.query_cache_ttl
                self.cache_manager.set(cache_key, result_df, ttl)

            # Record execution stats
            execution_time = (time.time() - start_time) * 1000
            stats = QueryStats(
                query_id=query_id,
                execution_time_ms=execution_time,
                rows_processed=plan.estimated_rows,
                rows_returned=len(result_df),
                bytes_scanned=0,  # Would need instrumentation to get actual bytes
                cache_hit=False,
                optimizations_applied=plan.optimizations,
            )
            self.query_stats.append(stats)

            self.logger.info(
                f"Query {query_id} completed in {execution_time:.1f}ms, "
                f"returned {len(result_df)} rows"
            )

            return result_df

        except Exception as e:
            self.logger.error(f"Query execution failed for {query_id}: {e}")
            raise

    def aggregate(
        self,
        table_name: str,
        group_by: list[str] | None = None,
        aggregations: dict[str, str] | None = None,
        filters: list[tuple[str, str, Any]] | None = None,
        having: list[tuple[str, str, Any]] | None = None,
    ) -> pd.DataFrame:
        """
        Perform aggregation operations

        Args:
            table_name: Table to aggregate
            group_by: Columns to group by
            aggregations: Dict of column -> aggregation function
            filters: WHERE clause filters as (column, operator, value) tuples
            having: HAVING clause filters as (column, operator, value) tuples

        Returns:
            Aggregated DataFrame
        """

        # Build SQL query
        agg_sql_parts = []

        if aggregations:
            for column, func in aggregations.items():
                agg_sql_parts.append(f"{func.upper()}({column}) as {column}_{func}")

        if group_by:
            select_parts = group_by + agg_sql_parts
        else:
            select_parts = agg_sql_parts

        sql = f"SELECT {', '.join(select_parts)} FROM {table_name}"

        # Add WHERE clause
        if filters:
            where_parts = []
            for col, op, val in filters:
                if isinstance(val, str):
                    where_parts.append(f"{col} {op} '{val}'")
                else:
                    where_parts.append(f"{col} {op} {val}")
            sql += f" WHERE {' AND '.join(where_parts)}"

        # Add GROUP BY
        if group_by:
            sql += f" GROUP BY {', '.join(group_by)}"

        # Add HAVING clause
        if having:
            having_parts = []
            for col, op, val in having:
                if isinstance(val, str):
                    having_parts.append(f"{col} {op} '{val}'")
                else:
                    having_parts.append(f"{col} {op} {val}")
            sql += f" HAVING {' AND '.join(having_parts)}"

        return self.execute_sql(sql, table_name)

    def time_series_analysis(
        self,
        table_name: str,
        time_column: str,
        value_columns: list[str],
        window_size: str = "1H",
        aggregation: str = "mean",
    ) -> pd.DataFrame:
        """
        Perform time series analysis with windowing

        Args:
            table_name: Table containing time series data
            time_column: Name of timestamp column
            value_columns: Columns to aggregate
            window_size: Window size (e.g., "1H", "1D", "1W")
            aggregation: Aggregation function

        Returns:
            Time series aggregation results
        """

        # Convert window size to SQL interval
        window_sql = self._convert_window_to_sql(window_size)

        # Build aggregation expressions
        agg_expressions = []
        for col in value_columns:
            agg_expressions.append(f"{aggregation.upper()}({col}) as {col}_{aggregation}")

        sql = f"""
        SELECT 
            DATE_TRUNC('{window_sql}', {time_column}) as time_window,
            {', '.join(agg_expressions)}
        FROM {table_name}
        GROUP BY DATE_TRUNC('{window_sql}', {time_column})
        ORDER BY time_window
        """

        return self.execute_sql(sql, table_name)

    def get_table_profile(self, table_name: str) -> dict[str, Any]:
        """
        Generate comprehensive data profile for a table

        Args:
            table_name: Table to profile

        Returns:
            Dictionary with profiling results
        """

        profile = {
            "table_name": table_name,
            "generated_at": datetime.now().isoformat(),
            "columns": {},
        }

        try:
            # Get basic table info
            table_stats = self.storage.get_table_stats(table_name)
            profile.update(table_stats)

            # Read a sample for profiling
            sample_df = self.storage.read_table(table_name, columns=None)
            if sample_df.empty:
                return profile

            # Profile each column
            for column in sample_df.columns:
                col_profile = self._profile_column(sample_df[column])
                profile["columns"][column] = col_profile

        except Exception as e:
            self.logger.error(f"Failed to profile table {table_name}: {e}")
            profile["error"] = str(e)

        return profile

    def optimize_table_layout(self, table_name: str) -> dict[str, Any]:
        """
        Analyze and suggest table layout optimizations

        Args:
            table_name: Table to optimize

        Returns:
            Optimization recommendations
        """

        recommendations = {
            "table_name": table_name,
            "current_layout": {},
            "recommendations": [],
            "potential_improvements": {},
        }

        try:
            # Get current table statistics
            stats = self.storage.get_table_stats(table_name)
            recommendations["current_layout"] = stats

            # Analyze query patterns (if we have stats)
            query_patterns = self._analyze_query_patterns(table_name)

            # Generate recommendations
            if stats["file_count"] > 100:
                recommendations["recommendations"].append(
                    {
                        "type": "file_consolidation",
                        "priority": "high",
                        "description": f'Consider consolidating {stats["file_count"]} files',
                        "potential_benefit": "Reduced query latency",
                    }
                )

            if query_patterns.get("frequent_filters"):
                recommendations["recommendations"].append(
                    {
                        "type": "partitioning",
                        "priority": "medium",
                        "description": f'Consider partitioning by {query_patterns["frequent_filters"]}',
                        "potential_benefit": "Improved filter performance",
                    }
                )

            # Estimate potential improvements
            recommendations["potential_improvements"] = {
                "query_speedup": "2-5x",
                "storage_savings": "10-30%",
                "io_reduction": "50-80%",
            }

        except Exception as e:
            self.logger.error(f"Failed to analyze table layout for {table_name}: {e}")
            recommendations["error"] = str(e)

        return recommendations

    def _execute_with_duckdb(self, query: str, table_name: str, plan: QueryPlan) -> pd.DataFrame:
        """Execute query using DuckDB for complex SQL support"""

        # Register Parquet files with DuckDB
        table_path = self.storage.storage_path / table_name

        if table_path.is_file():
            # Single file
            register_sql = f"CREATE VIEW {table_name} AS SELECT * FROM parquet_scan('{table_path}')"
        else:
            # Multiple files
            parquet_files = list(table_path.glob("*.parquet"))
            if not parquet_files:
                raise FileNotFoundError(f"No Parquet files found in {table_path}")

            file_list = "', '".join(str(f) for f in parquet_files)
            register_sql = (
                f"CREATE VIEW {table_name} AS SELECT * FROM parquet_scan(['{file_list}'])"
            )

        # Register table
        self.duckdb_conn.execute(register_sql)

        try:
            # Execute query
            result = self.duckdb_conn.execute(query).df()
            return result

        finally:
            # Clean up view
            self.duckdb_conn.execute(f"DROP VIEW IF EXISTS {table_name}")

    def _execute_with_arrow(self, query: str, table_name: str, plan: QueryPlan) -> pd.DataFrame:
        """Execute query using Arrow compute functions (limited SQL support)"""

        # This is a simplified implementation
        # For production, you'd want a proper SQL parser and execution engine

        # Load table
        arrow_table = self.storage.read_table(table_name)

        # Convert to Arrow table
        if isinstance(arrow_table, pd.DataFrame):
            arrow_table = pa.Table.from_pandas(arrow_table)

        # Apply optimizations from plan
        for optimization in plan.optimizations:
            if optimization == OptimizationTechnique.PROJECTION_PUSHDOWN:
                # Only load required columns
                arrow_table = self._apply_projection_pushdown(arrow_table, query)
            elif optimization == OptimizationTechnique.PREDICATE_PUSHDOWN:
                # Apply filters early
                arrow_table = self._apply_predicate_pushdown(arrow_table, query)

        # Convert back to pandas for final processing
        result_df = arrow_table.to_pandas()

        return result_df

    def _apply_projection_pushdown(self, table: pa.Table, query: str) -> pa.Table:
        """Apply column projection optimization"""

        # Simple column extraction from SELECT clause
        select_match = re.search(r"SELECT\s+(.*?)\s+FROM", query, re.IGNORECASE)
        if not select_match:
            return table

        select_clause = select_match.group(1).strip()

        if select_clause == "*":
            return table

        # Parse column names (simplified)
        columns = [col.strip() for col in select_clause.split(",")]
        columns = [col for col in columns if col in table.column_names]

        if columns:
            return table.select(columns)

        return table

    def _apply_predicate_pushdown(self, table: pa.Table, query: str) -> pa.Table:
        """Apply filter pushdown optimization"""

        # Simple WHERE clause extraction
        where_match = re.search(
            r"WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)", query, re.IGNORECASE
        )
        if not where_match:
            return table

        where_clause = where_match.group(1).strip()

        # This is a very simplified filter parser
        # In production, you'd want a proper SQL parser

        return table

    def _profile_column(self, series: pd.Series) -> dict[str, Any]:
        """Profile a single column"""

        profile = {
            "dtype": str(series.dtype),
            "non_null_count": series.notna().sum(),
            "null_count": series.isna().sum(),
            "null_percentage": (series.isna().sum() / len(series)) * 100,
            "unique_count": series.nunique(),
            "unique_percentage": (series.nunique() / len(series)) * 100,
        }

        if pd.api.types.is_numeric_dtype(series):
            profile.update(
                {
                    "min": series.min(),
                    "max": series.max(),
                    "mean": series.mean(),
                    "median": series.median(),
                    "std": series.std(),
                    "quantiles": {
                        "25%": series.quantile(0.25),
                        "75%": series.quantile(0.75),
                        "95%": series.quantile(0.95),
                        "99%": series.quantile(0.99),
                    },
                }
            )

        elif pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
            profile.update(
                {
                    "avg_length": series.astype(str).str.len().mean(),
                    "min_length": series.astype(str).str.len().min(),
                    "max_length": series.astype(str).str.len().max(),
                    "most_common": series.value_counts().head(5).to_dict(),
                }
            )

        return profile

    def _analyze_query_patterns(self, table_name: str) -> dict[str, Any]:
        """Analyze query patterns for a table"""

        patterns = {
            "frequent_filters": [],
            "frequent_aggregations": [],
            "frequent_joins": [],
            "query_count": len([s for s in self.query_stats if table_name in str(s.query_id)]),
        }

        # Analyze recent queries for patterns
        # This would be more sophisticated in production

        return patterns

    def _convert_window_to_sql(self, window_size: str) -> str:
        """Convert pandas-style window to SQL interval"""

        mapping = {
            "S": "second",
            "T": "minute",
            "H": "hour",
            "D": "day",
            "W": "week",
            "M": "month",
            "Q": "quarter",
            "Y": "year",
        }

        # Extract number and unit
        import re

        match = re.match(r"(\d+)([STHWMQY])", window_size.upper())
        if match:
            number, unit = match.groups()
            if unit in mapping:
                return mapping[unit]

        return "hour"  # Default fallback

    def _generate_query_id(self, query: str, table_name: str) -> str:
        """Generate unique query ID"""
        import hashlib

        content = f"{query}:{table_name}"
        return hashlib.md5(content.encode()).hexdigest()[:12]


class QueryOptimizer:
    """
    Query optimization engine for columnar analytics
    """

    def __init__(self, storage: ParquetStorage, cache_manager: CacheManager | None = None):
        self.storage = storage
        self.cache_manager = cache_manager
        self.logger = get_logger("query-optimizer")

        # Optimization rules
        self.optimization_rules = {
            "projection_pushdown": True,
            "predicate_pushdown": True,
            "partition_pruning": True,
            "join_reordering": True,
            "aggregation_pushdown": True,
        }

    def create_plan(self, query: str, table_name: str) -> QueryPlan:
        """
        Create optimized execution plan for query

        Args:
            query: SQL query string
            table_name: Primary table name

        Returns:
            Optimized query plan
        """

        query_id = self._generate_query_id(query, table_name)

        # Analyze query structure
        query_type = self._detect_query_type(query)

        # Estimate cost and selectivity
        estimated_cost, estimated_rows = self._estimate_cost(query, table_name)

        # Determine applicable optimizations
        optimizations = self._select_optimizations(query, query_type)

        # Generate execution steps
        execution_steps = self._generate_execution_steps(query, optimizations)

        # Determine caching eligibility
        cache_eligible = self._is_cache_eligible(query, query_type)

        plan = QueryPlan(
            query_id=query_id,
            query_type=query_type,
            estimated_cost=estimated_cost,
            estimated_rows=estimated_rows,
            optimizations=optimizations,
            execution_steps=execution_steps,
            cache_eligible=cache_eligible,
            parallel_eligible=self._is_parallel_eligible(query, query_type),
        )

        self.logger.debug(f"Created plan for query {query_id}: {len(optimizations)} optimizations")

        return plan

    def _detect_query_type(self, query: str) -> QueryType:
        """Detect the primary type of query"""
        query_lower = query.lower()

        if "group by" in query_lower:
            return QueryType.GROUPBY
        elif "join" in query_lower:
            return QueryType.JOIN
        elif "over(" in query_lower or "window" in query_lower:
            return QueryType.WINDOW
        elif any(func in query_lower for func in ["sum(", "count(", "avg(", "max(", "min("]):
            return QueryType.AGGREGATION
        elif "order by" in query_lower:
            return QueryType.SORT
        else:
            return QueryType.FILTER

    def _estimate_cost(self, query: str, table_name: str) -> tuple[float, int]:
        """Estimate query cost and result size"""

        try:
            # Get table statistics
            table_stats = self.storage.get_table_stats(table_name)
            total_rows = table_stats.get("total_rows", 1000)

            # Simple cost estimation based on query complexity
            base_cost = total_rows * 0.001  # Base scan cost

            query_lower = query.lower()

            # Adjust cost based on operations
            if "join" in query_lower:
                base_cost *= 5  # Joins are expensive

            if "group by" in query_lower:
                base_cost *= 2  # Grouping requires sorting/hashing

            if "order by" in query_lower:
                base_cost *= 1.5  # Sorting cost

            # Estimate selectivity for result size
            estimated_rows = total_rows

            if "where" in query_lower:
                # Assume WHERE clauses reduce result by 80%
                estimated_rows = int(total_rows * 0.2)

            if "group by" in query_lower:
                # Assume grouping reduces to 10% of original rows
                estimated_rows = int(total_rows * 0.1)

            return base_cost, estimated_rows

        except Exception as e:
            self.logger.warning(f"Cost estimation failed: {e}")
            return 100.0, 1000  # Default estimates

    def _select_optimizations(
        self, query: str, query_type: QueryType
    ) -> list[OptimizationTechnique]:
        """Select applicable optimization techniques"""

        optimizations = []
        query_lower = query.lower()

        # Always try columnar scan for analytics
        optimizations.append(OptimizationTechnique.COLUMNAR_SCAN)

        # Projection pushdown if not SELECT *
        if "select *" not in query_lower:
            optimizations.append(OptimizationTechnique.PROJECTION_PUSHDOWN)

        # Predicate pushdown if WHERE clause exists
        if "where" in query_lower:
            optimizations.append(OptimizationTechnique.PREDICATE_PUSHDOWN)

        # Vectorization for aggregations
        if query_type in [QueryType.AGGREGATION, QueryType.GROUPBY]:
            optimizations.append(OptimizationTechnique.VECTORIZATION)

        # Caching for complex queries
        if query_type in [QueryType.JOIN, QueryType.WINDOW]:
            optimizations.append(OptimizationTechnique.CACHING)

        return optimizations

    def _generate_execution_steps(
        self, query: str, optimizations: list[OptimizationTechnique]
    ) -> list[str]:
        """Generate execution steps for the query plan"""

        steps = []

        # Data access steps
        if OptimizationTechnique.PARTITION_PRUNING in optimizations:
            steps.append("1. Prune irrelevant partitions")

        if OptimizationTechnique.PROJECTION_PUSHDOWN in optimizations:
            steps.append("2. Load only required columns")
        else:
            steps.append("2. Load all columns")

        if OptimizationTechnique.PREDICATE_PUSHDOWN in optimizations:
            steps.append("3. Apply filters during scan")

        # Processing steps
        query_lower = query.lower()

        if "join" in query_lower:
            steps.append("4. Execute join operations")

        if "group by" in query_lower:
            steps.append("5. Group and aggregate data")

        if "order by" in query_lower:
            steps.append("6. Sort results")

        # Final steps
        steps.append("7. Return results")

        if OptimizationTechnique.CACHING in optimizations:
            steps.append("8. Cache results for future queries")

        return steps

    def _is_cache_eligible(self, query: str, query_type: QueryType) -> bool:
        """Determine if query results should be cached"""

        # Don't cache simple filters (too many variations)
        if query_type == QueryType.FILTER:
            return False

        # Cache expensive operations
        if query_type in [QueryType.JOIN, QueryType.WINDOW, QueryType.GROUPBY]:
            return True

        # Cache aggregations
        if query_type == QueryType.AGGREGATION:
            return True

        return False

    def _is_parallel_eligible(self, query: str, query_type: QueryType) -> bool:
        """Determine if query can be parallelized"""

        # Most analytical queries can be parallelized
        return query_type in [
            QueryType.AGGREGATION,
            QueryType.FILTER,
            QueryType.GROUPBY,
            QueryType.SORT,
        ]

    def _generate_query_id(self, query: str, table_name: str) -> str:
        """Generate unique query ID"""
        import hashlib

        content = f"{query}:{table_name}"
        return hashlib.md5(content.encode()).hexdigest()[:12]


# Utility functions for analytics
def create_materialized_view(
    analytics: ColumnarAnalytics,
    view_name: str,
    base_query: str,
    base_table: str,
    refresh_interval_hours: int = 24,
) -> dict[str, Any]:
    """Create a materialized view for frequently accessed data"""

    logger = get_logger("materialized-view")

    try:
        # Execute base query
        result_df = analytics.execute_sql(base_query, base_table, use_cache=False)

        # Store as new table
        analytics.storage.write_dataframe(result_df, view_name)

        # Store metadata about the view
        view_metadata = {
            "view_name": view_name,
            "base_table": base_table,
            "base_query": base_query,
            "created_at": datetime.now().isoformat(),
            "refresh_interval_hours": refresh_interval_hours,
            "last_refresh": datetime.now().isoformat(),
            "row_count": len(result_df),
        }

        logger.info(f"Created materialized view {view_name} with {len(result_df)} rows")

        return view_metadata

    except Exception as e:
        logger.error(f"Failed to create materialized view {view_name}: {e}")
        raise


def benchmark_query_performance(
    analytics: ColumnarAnalytics, queries: list[tuple[str, str]], iterations: int = 3
) -> dict[str, Any]:
    """Benchmark query performance"""

    logger = get_logger("query-benchmark")
    results = {}

    for query, table_name in queries:
        query_id = analytics._generate_query_id(query, table_name)
        execution_times = []

        logger.info(f"Benchmarking query {query_id}")

        for i in range(iterations):
            start_time = time.time()

            try:
                result = analytics.execute_sql(query, table_name, use_cache=False)
                execution_time = (time.time() - start_time) * 1000
                execution_times.append(execution_time)

                logger.debug(f"Iteration {i+1}: {execution_time:.1f}ms, {len(result)} rows")

            except Exception as e:
                logger.error(f"Query failed on iteration {i+1}: {e}")
                execution_times.append(float("inf"))

        # Calculate statistics
        valid_times = [t for t in execution_times if t != float("inf")]

        if valid_times:
            results[query_id] = {
                "query": query,
                "table_name": table_name,
                "iterations": iterations,
                "successful_runs": len(valid_times),
                "avg_time_ms": sum(valid_times) / len(valid_times),
                "min_time_ms": min(valid_times),
                "max_time_ms": max(valid_times),
                "all_times_ms": execution_times,
            }
        else:
            results[query_id] = {
                "query": query,
                "table_name": table_name,
                "error": "All iterations failed",
            }

    return results
