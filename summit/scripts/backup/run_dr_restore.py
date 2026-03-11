#!/usr/bin/env python3
import argparse
import logging
import sys

from summit.backup.manager import BackupManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def main():
    parser = argparse.ArgumentParser(description="Summit Disaster Recovery Restore Script")
    parser.add_argument("--provider", type=str, required=True, help="Provider to restore (e.g., redis)")
    parser.add_argument("--file", type=str, required=True, help="Path to the backup JSONL file")
    args = parser.parse_args()

    manager = BackupManager()

    logging.info(f"Starting DR restore for provider '{args.provider}' from file '{args.file}'...")
    success = manager.execute_restore(args.provider, args.file)

    if success:
        logging.info("DR Restore completed successfully.")
    else:
        logging.error("DR Restore failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
