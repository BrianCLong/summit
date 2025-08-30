#!/usr/bin/env python3
import sys


def main():
    tenant = sys.argv[1] if len(sys.argv) > 1 else ""
    print(f"Purged payments for {tenant}")
    print("signed-receipt-placeholder")


if __name__ == "__main__":
    main()
