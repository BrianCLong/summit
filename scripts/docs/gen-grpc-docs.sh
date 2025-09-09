#!/usr/bin/env bash
set -euo pipefail
protoc --doc_out=docs/reference/grpc --doc_opt=markdown,grpc.md -I proto proto/*.proto