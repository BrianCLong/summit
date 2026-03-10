#!/usr/bin/env python3
import argparse
import json
import logging
import sys

from summit.backup.manager import BackupManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def main():
    parser = argparse.ArgumentParser(description="Summit Disaster Recovery Backup Script")
    parser.add_argument("--dir", type=str, default="/tmp/backups", help="Directory to store backups")
    parser.add_argument("--provider", type=str, help="Specific provider to backup (e.g., redis_cache). If omitted, all are backed up.")
    args = parser.parse_args()

    manager = BackupManager(backup_dir=args.dir)

    if args.provider:
        logging.info(f"Starting DR backup for provider: {args.provider}...")
        result = manager.execute_backup(args.provider)
        print(json.dumps(result, indent=2))
        if result.get("status") != "success":
            sys.exit(1)
    else:
        logging.info("Starting comprehensive DR backup for all providers...")
        results = manager.execute_all_backups()
        print(json.dumps(results, indent=2))
        if any(res.get("status") != "success" for res in results.values()):
            sys.exit(1)

    logging.info("DR Backup completed successfully.")

if __name__ == "__main__":
    main()
