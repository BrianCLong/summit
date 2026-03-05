from summit.influence.provenance_analyzer import analyze_provenance


def test_provenance_analyzer():
    media_metadata = {
        'compression_artifacts': 0.9,
        'gan_fingerprint_match': True,
        'metadata_inconsistencies': 1
    }
    result = analyze_provenance(media_metadata)
    assert result['is_synthetic'] is True
    assert 'high_compression_artifacts' in result['signals']
    assert 'gan_fingerprint_detected' in result['signals']
