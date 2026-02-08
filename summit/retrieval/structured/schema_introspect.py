"""Schema introspection for structured retrieval."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

from .types import Column, Schema, Table


@dataclass(frozen=True)
class SchemaIntrospector:
    """Extracts schema metadata from a SQLite database connection."""

    connection: object

    def _fetchall(self, sql: str, params: Sequence[object] | None = None) -> Iterable[tuple]:
        cursor = self.connection.cursor()
        cursor.execute(sql, params or [])
        rows = cursor.fetchall()
        cursor.close()
        return rows

    def _tables(self) -> Sequence[str]:
        rows = self._fetchall(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        return [row[0] for row in rows]

    def _columns(self, table: str) -> Sequence[Column]:
        rows = self._fetchall(f"PRAGMA table_info({table})")
        columns: list[Column] = []
        for _, name, data_type, not_null, _, _ in rows:
            columns.append(Column(name=name, data_type=data_type, nullable=not not_null))
        return columns

    def _primary_key(self, table: str) -> Sequence[str] | None:
        rows = self._fetchall(f"PRAGMA table_info({table})")
        pk_cols = [row[1] for row in rows if row[5] > 0]
        return pk_cols or None

    def _foreign_keys(self, table: str) -> dict[str, str]:
        rows = self._fetchall(f"PRAGMA foreign_key_list({table})")
        fks: dict[str, str] = {}
        for _, _, ref_table, from_col, to_col, *_ in rows:
            fks[from_col] = f"{ref_table}.{to_col}"
        return fks

    def introspect(self) -> Schema:
        tables: list[Table] = []
        for table in self._tables():
            tables.append(
                Table(
                    name=table,
                    columns=self._columns(table),
                    primary_key=self._primary_key(table),
                    foreign_keys=self._foreign_keys(table),
                )
            )
        return Schema(tables=tables)
