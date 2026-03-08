# Disaster Recovery & Backup Strategy

This directory contains the scripts and documentation for Summit's Disaster Recovery (DR) and Backup system.

## Overview

The backup system is designed to ensure data durability and rapid recovery in case of system failure, data corruption, or accidental deletion.

### RPO (Recovery Point Objective)
- **Goal**: < 24 hours (Standard), < 1 hour (High Availability configuration)
- **Current Implementation**: Daily backups (schedulable via cron) + on-demand backups.

### RTO (Recovery Time Objective)
- **Goal**: < 1 hour
- **Current Implementation**: Automated restore scripts available.

## Components

### 1. `backup.sh`
Performs a full backup of:
- **PostgreSQL**: Using `pg_dump` (Custom format).
- **Redis**: Using `redis-cli --rdb` (Snapshot).

**Features**:
- Generates a timestamped tarball.
- Calculates SHA256 checksums for integrity verification.
- Stores metadata (`metadata.json`) inside the archive.
- Uploads to S3 (if configured).
- Implements local retention policy (default 7 days).

### 2. `restore.sh`
Restores data from a specific backup timestamp.

**Features**:
- Supports restoring from local file or downloading from S3.
- Verifies checksums before restoration.
- **Safety**: Requires interactive confirmation (or `--force` flag) to prevent accidental overwrites.
- Automates Redis restart after placing the RDB file.

### 3. `verify_backup.sh`
A utility script to verify the integrity of the latest local backup. It checks the SHA256 hash and ensures essential files (`postgres.dump`, `metadata.json`) are present in the archive.

## Configuration

The scripts use the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | Hostname of Postgres service | `postgres` |
| `POSTGRES_PORT` | Port of Postgres service | `5432` |
| `POSTGRES_USER` | Postgres username | `postgres` |
| `POSTGRES_DB` | Postgres database name | `postgres` |
| `POSTGRES_PASSWORD` | Postgres password | `postgres` |
| `REDIS_HOST` | Hostname of Redis service | `redis` |
| `REDIS_PORT` | Port of Redis service | `6379` |
| `REDIS_PASSWORD` | Redis password | `devpassword` |
| `S3_BUCKET` | S3 Bucket for offsite storage | (Optional) |
| `S3_ENDPOINT` | S3 Endpoint (for MinIO/custom) | (Optional) |
| `AWS_ACCESS_KEY_ID` | AWS Access Key | (Required for S3) |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | (Required for S3) |
| `RETENTION_DAYS` | Days to keep local backups | `7` |

## Usage

### Running a Backup
```bash
./backup.sh
```

### Restoring a Backup
```bash
./restore.sh 20231025_120000
```
Or to force without prompt:
```bash
./restore.sh 20231025_120000 --force
```

### Verifying Backups
```bash
./verify_backup.sh
```

## Disaster Recovery Procedure

1. **Assess the Incident**: Determine if a restore is necessary.
2. **Locate Backup**: Find the most recent valid backup (locally or in S3).
3. **Verify Integrity**: Run verification on the backup archive.
4. **Prepare Environment**: Ensure database services are running.
5. **Execute Restore**: Run `restore.sh`.
6. **Validate**: Check application health and data consistency.
