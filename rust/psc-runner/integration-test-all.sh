#!/bin/bash
# integration-test-all.sh
set -e

echo "=== CROSS-STREAM INTEGRATION TESTING ==="

# Test 1: Config-driven feature toggling
cargo test test_config_driven_serialization --all-features

# Test 2: End-to-end tracing propagation
cargo test test_tracing_across_services --all-features

# Test 3: Health-aware load balancing
cargo test test_health_based_routing --all-features

# Test 4: Storage performance under load
cargo test test_storage_benchmarks --all-features

# Test 5: Operator configuration management
cargo test test_operator_config_updates --all-features

# Test 6: Full stack performance regression
cargo bench --all-features

echo "=== INTEGRATION TESTING COMPLETE ==="
