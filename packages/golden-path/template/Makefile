SHELL := /bin/bash

.PHONY: dev test lint format sbom

dev:
pnpm install --ignore-scripts
npx tsx cmd/server.ts

test:
npx jest --runInBand

lint:
npx eslint .

format:
npx prettier -w .

sbom:
npx node ../../src/supply-chain/sbom.js
