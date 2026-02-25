import os

import pytest

from summit.hybrid.cassandra_adapter import CassandraAdapter
from summit.hybrid.s3_archive_adapter import S3ArchiveAdapter


def test_cassandra_off_by_default():
    # ensure env var is not set to on
    if "HYBRID_SOURCES" in os.environ:
        del os.environ["HYBRID_SOURCES"]

    adapter = CassandraAdapter()
    assert adapter.enabled is False
    assert adapter.fetch_attributes("123") is None

def test_s3_off_by_default():
    if "HYBRID_SOURCES" in os.environ:
        del os.environ["HYBRID_SOURCES"]

    adapter = S3ArchiveAdapter()
    assert adapter.enabled is False
    assert adapter.fetch_archive("key") is None

def test_cassandra_on(monkeypatch):
    monkeypatch.setenv("HYBRID_SOURCES", "on")
    adapter = CassandraAdapter()
    assert adapter.enabled is True
    res = adapter.fetch_attributes("123")
    assert res is not None
    assert res["source"] == "cassandra"
