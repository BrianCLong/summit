#!/usr/bin/env python3
"""Quick validation script to check Maestro modules import correctly."""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

print("Validating Maestro modules...")

try:
    from maestro.models import Run, Artifact, DisclosurePack, RunStatus, ArtifactKind
    print("✓ maestro.models imports successfully")
except Exception as e:
    print(f"✗ maestro.models failed: {e}")
    sys.exit(1)

try:
    from maestro.storage import MaestroStore
    print("✓ maestro.storage imports successfully")
except Exception as e:
    print(f"✗ maestro.storage failed: {e}")
    sys.exit(1)

try:
    from maestro.checks import check_release_gate, generate_compliance_report
    print("✓ maestro.checks imports successfully")
except Exception as e:
    print(f"✗ maestro.checks failed: {e}")
    sys.exit(1)

# Test basic functionality
print("\nTesting basic operations...")

try:
    # Create store
    store = MaestroStore()
    print("✓ MaestroStore instantiated")

    # Create run
    run = Run(name="Test Run", owner="test@example.com")
    store.create_run(run)
    print(f"✓ Created run: {run.id}")

    # Retrieve run
    retrieved = store.get_run(run.id)
    assert retrieved.id == run.id
    print("✓ Retrieved run successfully")

    # Create artifact
    from maestro.models import ArtifactMetadata

    artifact = Artifact(
        run_id=run.id,
        kind=ArtifactKind.SBOM,
        path_or_uri="s3://test/sbom.json",
        metadata_json=ArtifactMetadata(
            sbom_present=True,
            slsa_provenance_present=True,
            risk_assessment_present=True,
        ),
    )
    store.create_artifact(artifact)
    print(f"✓ Created artifact: {artifact.id}")

    # Update run to succeeded
    store.update_run(run.id, {"status": RunStatus.SUCCEEDED})
    print("✓ Updated run status to succeeded")

    # Check release gate
    result = check_release_gate(store, run.id)
    assert result.passed, f"Release gate should pass but got: {result.message}"
    print("✓ Release gate check passed")

    # Generate compliance report
    report = generate_compliance_report(store, run.id)
    assert report["release_gate_passed"] is True
    assert report["summary"]["compliant_artifacts"] == 1
    print("✓ Compliance report generated")

    print("\n✅ All validations passed!")

except Exception as e:
    print(f"\n✗ Validation failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
