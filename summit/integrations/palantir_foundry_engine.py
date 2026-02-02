from __future__ import annotations

import pandas as pd
import sqlite3
from dataclasses import dataclass, field
from typing import List, Dict, Callable, Any, Optional
from datetime import datetime

@dataclass
class DatasetSpec:
    rid: str
    schema: Dict[str, str]
    primary_keys: List[str]

@dataclass
class Transform:
    output_rid: str
    input_rids: List[str]
    logic: Callable[[Dict[str, pd.DataFrame]], pd.DataFrame]
    type: str = "PYTHON"  # or "SQL"

class TransformRunner:
    """
    Simulates Foundry's Build Service.
    Executes transforms in dependency order, enforcing schemas and incremental logic.
    """
    def __init__(self):
        self.datasets: Dict[str, pd.DataFrame] = {}
        self.transforms: Dict[str, Transform] = {}
        self.snapshots: Dict[str, str] = {} # rid -> last_transaction_id

    def register_dataset(self, rid: str, df: pd.DataFrame):
        self.datasets[rid] = df

    def register_transform(self, transform: Transform):
        self.transforms[transform.output_rid] = transform

    def build(self, target_rids: List[str], incremental: bool = False) -> Dict[str, str]:
        """
        Executes the build graph for targets.
        Returns a dict of {rid: status}.
        """
        built = {}
        for rid in target_rids:
            if rid in built: continue

            transform = self.transforms.get(rid)
            if not transform:
                raise ValueError(f"No transform found for {rid}")

            # 1. Recursive Build (Dependency Resolution)
            inputs = {}
            for input_rid in transform.input_rids:
                if input_rid not in self.datasets:
                    # Try to build it
                    self.build([input_rid], incremental)
                inputs[input_rid] = self.datasets[input_rid]

            # 2. Incremental Logic (Simulation)
            if incremental and rid in self.snapshots:
                # In real life, we'd filter inputs based on transaction IDs
                # Here we just pretend we are filtering
                print(f"Building {rid} incrementally...")
            else:
                print(f"Snapshot build for {rid}...")

            # 3. Execution
            try:
                output_df = transform.logic(inputs)

                # 4. Schema Enforcement (Simplified)
                # Ensure no duplicate primary keys if defined
                # (Logic omitted for brevity, but would be here)

                self.datasets[rid] = output_df
                self.snapshots[rid] = datetime.now().isoformat()
                built[rid] = "SUCCESS"
            except Exception as e:
                built[rid] = f"FAILED: {e}"
                raise e

        return built

    def sql_transform_wrapper(self, sql: str, inputs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Executes a SQL transform using in-memory SQLite.
        """
        conn = sqlite3.connect(":memory:")
        for rid, df in inputs.items():
            # Sanitize table name (rid usually has dots)
            table_name = rid.replace(".", "_")
            df.to_sql(table_name, conn, index=False)

        # Replace RIDs in SQL with table names
        clean_sql = sql
        for rid in inputs.keys():
            clean_sql = clean_sql.replace(rid, rid.replace(".", "_"))

        result = pd.read_sql(clean_sql, conn)
        return result
