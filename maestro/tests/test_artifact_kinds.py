from maestro.models import ArtifactKind

def test_specification_artifact_kind_exists():
    """Verify that the SPECIFICATION artifact kind is defined in the models."""
    assert ArtifactKind.SPECIFICATION == "specification"
    assert "specification" in [kind.value for kind in ArtifactKind]
