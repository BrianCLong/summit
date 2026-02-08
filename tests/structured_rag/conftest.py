import sqlite3
from pathlib import Path

import pytest


def _seed_db(connection: sqlite3.Connection) -> None:
    cursor = connection.cursor()
    cursor.executescript(
        """
        PRAGMA foreign_keys = ON;
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            created_date TEXT NOT NULL
        );
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        );
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL
        );
        """
    )
    cursor.executemany(
        "INSERT INTO customers (id, name, email, tenant_id, created_date) VALUES (?, ?, ?, ?, ?)",
        [
            (1, "John Doe", "john1@example.com", "tenant-a", "2026-01-05"),
            (2, "John Doe", "john2@example.com", "tenant-a", "2026-01-06"),
            (3, "Jane Roe", "jane@example.com", "tenant-a", "2026-01-10"),
        ],
    )
    cursor.executemany(
        "INSERT INTO orders (id, customer_id, amount, date, tenant_id) VALUES (?, ?, ?, ?, ?)",
        [
            (1, 1, 100.0, "2026-01-15", "tenant-a"),
            (2, 1, 50.0, "2026-01-20", "tenant-a"),
            (3, 2, 80.0, "2026-01-12", "tenant-a"),
            (4, 3, 25.0, "2026-01-18", "tenant-a"),
        ],
    )
    connection.commit()
    cursor.close()


@pytest.fixture()
def sqlite_db(tmp_path: Path) -> sqlite3.Connection:
    db_path = tmp_path / "structured_rag.db"
    connection = sqlite3.connect(db_path)
    _seed_db(connection)
    yield connection
    connection.close()
