#!/usr/bin/env python3
import json
import sys

def main(subject: str):
  # Placeholder: would delete artifacts and generate receipt
  receipt = {"subject": subject, "status": "purged"}
  print(json.dumps(receipt))

if __name__ == '__main__':
  if len(sys.argv) < 2:
    print('usage: dsar_products.py <subject>')
    sys.exit(1)
  main(sys.argv[1])
