#!/usr/bin/env python3
"""Upload detector artifacts to cloud object storage providers."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import yaml

try:
    import boto3
except ImportError:  # pragma: no cover - provider optional
    boto3 = None

try:
    from azure.storage.blob import BlobServiceClient
except ImportError:  # pragma: no cover - provider optional
    BlobServiceClient = None

try:
    from google.cloud import storage as gcs
except ImportError:  # pragma: no cover - provider optional
    gcs = None


class UploadError(RuntimeError):
    """Raised when upload configuration is invalid."""


def load_config() -> dict:
    cfg_path = Path("config/config.yaml")
    if not cfg_path.exists():
        raise UploadError("config/config.yaml not found")
    with cfg_path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def resolve_uploader(cfg: dict):
    upload_cfg = cfg.get("upload", {})
    if not upload_cfg.get("enabled", False):
        print("upload disabled")
        sys.exit(0)

    provider = upload_cfg.get("provider")
    if provider == "s3":
        if boto3 is None:
            raise UploadError("boto3 is required for S3 uploads")
        bucket = upload_cfg.get("s3", {}).get("bucket")
        if not bucket:
            raise UploadError("S3 bucket not configured")
        client = boto3.client("s3")
        prefix = upload_cfg.get("s3", {}).get("prefix", "")

        def uploader(path: Path, blob_name: str) -> None:
            client.upload_file(
                str(path), bucket, prefix + blob_name, ExtraArgs={"ChecksumAlgorithm": "SHA256"}
            )

        return uploader

    if provider == "azure":
        if BlobServiceClient is None:
            raise UploadError("azure-storage-blob is required for Azure uploads")
        container = upload_cfg.get("azure", {}).get("container")
        if not container:
            raise UploadError("Azure container not configured")
        connection = upload_cfg.get("azure", {}).get("connection_string") or os.getenv(
            "AZURE_STORAGE_CONNECTION_STRING"
        )
        if not connection:
            raise UploadError("Azure connection string not provided")
        service = BlobServiceClient.from_connection_string(connection)
        container_client = service.get_container_client(container)
        prefix = upload_cfg.get("azure", {}).get("prefix", "")

        def uploader(path: Path, blob_name: str) -> None:
            with path.open("rb") as handle:
                container_client.upload_blob(name=prefix + blob_name, data=handle, overwrite=True)

        return uploader

    if provider == "gcs":
        if gcs is None:
            raise UploadError("google-cloud-storage is required for GCS uploads")
        bucket_name = upload_cfg.get("gcs", {}).get("bucket")
        if not bucket_name:
            raise UploadError("GCS bucket not configured")
        client = gcs.Client()
        bucket = client.bucket(bucket_name)
        prefix = upload_cfg.get("gcs", {}).get("prefix", "")

        def uploader(path: Path, blob_name: str) -> None:
            blob = bucket.blob(prefix + blob_name)
            blob.upload_from_filename(str(path))

        return uploader

    raise UploadError(f"Unknown provider: {provider}")


def iter_artifacts(cfg: dict):
    base_paths = [Path(cfg["paths"]["clips"]), Path(cfg["paths"]["specs"])]
    for base in base_paths:
        base.mkdir(parents=True, exist_ok=True)
        for artifact in sorted(base.glob("*")):
            if artifact.is_file():
                yield artifact

    events = Path(cfg["paths"]["events"])
    if events.exists():
        yield events


def main() -> None:
    cfg = load_config()
    uploader = resolve_uploader(cfg)

    for artifact in iter_artifacts(cfg):
        rel = artifact.relative_to(Path("."))
        blob_name = str(rel).replace("\\", "/")
        uploader(artifact, blob_name)
        print(f"uploaded {artifact} -> {blob_name}")


if __name__ == "__main__":
    try:
        main()
    except UploadError as exc:
        print(f"upload failed: {exc}")
        sys.exit(1)
