#!/bin/bash
cat << 'EOF_INNER' > test_mock.py
import os
import sys

def mock_scan():
    print("Mock scan running")
    sys.exit(0)

if __name__ == "__main__":
    mock_scan()
EOF_INNER

cat << 'EOF_PATCH' > scripts/security/mock_scan.ts
console.log("Mock scan running");
process.exit(0);
EOF_PATCH

chmod +x scripts/security/mock_scan.ts
