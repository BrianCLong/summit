# DSAR for Publishers

The `dsar_publishers.py` script removes stored bundles, caches, and receipts for a
publisher across tenants and emits a signed receipt confirming deletion.

Usage:
```
python scripts/compliance/dsar_publishers.py <publisher_id>
```

Receipts use SHA-256 digests of deleted paths to provide tamper evidence.
