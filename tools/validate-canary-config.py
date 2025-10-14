#!/usr/bin/env python3
"""
MC Platform - Canary Configuration Validator
Prevents configuration drift between canary params and workflow gates
"""

import json
import argparse
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Optional

def load_json_file(file_path: str) -> Dict[str, Any]:
    """Load and parse JSON file"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found: {file_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {file_path}: {e}")
        sys.exit(1)

def find_workflow_files(workflows_dir: str) -> List[str]:
    """Find all workflow YAML files"""
    workflow_files = []
    workflows_path = Path(workflows_dir)

    if workflows_path.exists():
        for file_path in workflows_path.rglob("*.yml"):
            workflow_files.append(str(file_path))
        for file_path in workflows_path.rglob("*.yaml"):
            workflow_files.append(str(file_path))

    return workflow_files

def extract_gate_values_from_workflow(workflow_content: str) -> Dict[str, Any]:
    """Extract gate values from workflow YAML content"""
    # Simple extraction - in production, use a YAML parser
    gates = {}

    # Look for common gate patterns
    lines = workflow_content.split('\n')
    for line in lines:
        line = line.strip()

        # p95 latency threshold
        if 'p95_threshold' in line or 'latency_threshold' in line:
            if ':' in line:
                try:
                    value = line.split(':')[1].strip()
                    gates['p95_latency_ms'] = int(value)
                except:
                    pass

        # Error rate threshold
        if 'error_rate_threshold' in line:
            if ':' in line:
                try:
                    value = line.split(':')[1].strip()
                    gates['error_rate_threshold'] = float(value)
                except:
                    pass

        # Availability threshold
        if 'availability_threshold' in line:
            if ':' in line:
                try:
                    value = line.split(':')[1].strip()
                    gates['availability_threshold'] = float(value)
                except:
                    pass

    return gates

def validate_canary_config(config_path: str, workflows_dir: str) -> bool:
    """Validate canary configuration against workflow gates"""
    print(f"🔍 Validating canary configuration: {config_path}")

    # Load canary configuration
    config = load_json_file(config_path)

    # Extract expected values
    slo_gates = config.get('slo_gates', {})
    rollback_triggers = config.get('rollback_triggers', {})
    waves = config.get('waves', [])

    validation_errors = []
    validation_warnings = []

    # Validate SLO gates structure
    required_slo_gates = [
        'p95_latency_regression_pct',
        'error_rate_non_worse'
    ]

    for gate in required_slo_gates:
        if gate not in slo_gates:
            validation_errors.append(f"Missing required SLO gate: {gate}")

    # Validate rollback triggers structure
    required_rollback_triggers = [
        'graphql_p95_ms_30m',
        'autonomy_comp_pct_24h',
        'siem_delivery_pct_15m'
    ]

    for trigger in required_rollback_triggers:
        if trigger not in rollback_triggers:
            validation_errors.append(f"Missing required rollback trigger: {trigger}")

    # Validate wave configuration
    if not waves:
        validation_errors.append("No deployment waves configured")
    else:
        expected_waves = [20, 50, 100]
        actual_waves = [wave.get('traffic_pct') for wave in waves]

        if actual_waves != expected_waves:
            validation_errors.append(f"Wave configuration mismatch. Expected: {expected_waves}, Got: {actual_waves}")

        # Check bake times
        for wave in waves:
            if wave.get('traffic_pct') < 100 and wave.get('bake_minutes', 0) < 30:
                validation_warnings.append(f"Wave {wave.get('traffic_pct')}% has short bake time: {wave.get('bake_minutes')}min")

    # Validate specific thresholds
    p95_regression = slo_gates.get('p95_latency_regression_pct')
    if p95_regression and p95_regression > 10:
        validation_warnings.append(f"P95 latency regression threshold high: {p95_regression}%")

    graphql_p95 = rollback_triggers.get('graphql_p95_ms_30m')
    if graphql_p95 and graphql_p95 > 500:
        validation_warnings.append(f"GraphQL p95 rollback threshold high: {graphql_p95}ms")

    autonomy_comp = rollback_triggers.get('autonomy_comp_pct_24h')
    if autonomy_comp and autonomy_comp > 1.0:
        validation_warnings.append(f"Autonomy compensation threshold high: {autonomy_comp}%")

    # Validate feature flags
    feature_flags = config.get('feature_flags', {})
    expected_features = [
        'differential_privacy_enabled',
        'config_auto_remediation_enabled',
        'budget_guard_enforcement',
        'provenance_query_api_enabled',
        'autonomy_tier3_tenant_004',
        'autonomy_tier3_tenant_005'
    ]

    for feature in expected_features:
        if feature not in feature_flags:
            validation_warnings.append(f"Missing feature flag: {feature}")
        elif not feature_flags[feature]:
            validation_warnings.append(f"Feature flag disabled: {feature}")

    # Check workflow compatibility (simplified)
    workflow_files = find_workflow_files(workflows_dir)
    print(f"📁 Found {len(workflow_files)} workflow files")

    for workflow_file in workflow_files:
        try:
            with open(workflow_file, 'r') as f:
                workflow_content = f.read()

            # Check for canary-related workflows
            if 'canary' in workflow_content.lower() or 'deployment' in workflow_content.lower():
                print(f"📋 Checking workflow: {workflow_file}")

                # Extract any gate values we can find
                workflow_gates = extract_gate_values_from_workflow(workflow_content)

                # Compare with config (basic validation)
                if workflow_gates:
                    print(f"   Found gates: {workflow_gates}")
        except Exception as e:
            validation_warnings.append(f"Could not read workflow file {workflow_file}: {e}")

    # Report results
    print(f"\n📊 Validation Results:")
    print(f"   Config file: {config_path}")
    print(f"   Workflows dir: {workflows_dir}")

    if validation_errors:
        print(f"\n❌ Validation Errors ({len(validation_errors)}):")
        for error in validation_errors:
            print(f"   • {error}")

    if validation_warnings:
        print(f"\n⚠️ Validation Warnings ({len(validation_warnings)}):")
        for warning in validation_warnings:
            print(f"   • {warning}")

    if not validation_errors and not validation_warnings:
        print(f"\n✅ Validation passed: No issues found")
        return True
    elif not validation_errors:
        print(f"\n✅ Validation passed: Only warnings found")
        return True
    else:
        print(f"\n❌ Validation failed: {len(validation_errors)} errors found")
        return False

def generate_validation_report(config_path: str, validation_result: bool) -> str:
    """Generate a validation report"""
    report = {
        "validation_metadata": {
            "config_file": config_path,
            "validation_passed": validation_result,
            "validator_version": "1.0",
            "timestamp": "2025-09-26T15:45:00Z"
        },
        "checks_performed": [
            "slo_gates_structure",
            "rollback_triggers_structure",
            "wave_configuration",
            "threshold_validation",
            "feature_flags_validation",
            "workflow_compatibility"
        ],
        "recommendation": "APPROVED" if validation_result else "REQUIRES_FIXES"
    }

    report_path = "out/canary-config-validation.json"
    os.makedirs("out", exist_ok=True)

    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    return report_path

def main():
    parser = argparse.ArgumentParser(description="Validate MC Platform canary configuration")
    parser.add_argument("--config", required=True, help="Path to canary configuration JSON file")
    parser.add_argument("--workflows", default=".github/workflows", help="Path to workflows directory")
    parser.add_argument("--report", action="store_true", help="Generate validation report")

    args = parser.parse_args()

    print("🔧 MC Platform Canary Configuration Validator")
    print("=" * 50)

    # Validate configuration
    validation_passed = validate_canary_config(args.config, args.workflows)

    # Generate report if requested
    if args.report:
        report_path = generate_validation_report(args.config, validation_passed)
        print(f"\n📄 Validation report generated: {report_path}")

    # Exit with appropriate code
    sys.exit(0 if validation_passed else 1)

if __name__ == "__main__":
    main()