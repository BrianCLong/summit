#!/bin/bash
sed -i '/pnpm install/i \      - run: npm install -g pnpm@10.0.0\n' .github/workflows/verify-integrity.yml || true
sed -i '/pnpm install/i \      - run: npm install -g pnpm@10.0.0\n' .github/workflows/repro-docker.yml || true
