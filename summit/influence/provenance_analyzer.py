def analyze_provenance(media_metadata):
    """
    Detect AI-generated media.
    """
    signals = []
    is_synthetic = False

    if media_metadata.get('compression_artifacts', 0) > 0.8:
        signals.append('high_compression_artifacts')
        is_synthetic = True

    if media_metadata.get('gan_fingerprint_match', False):
        signals.append('gan_fingerprint_detected')
        is_synthetic = True

    if media_metadata.get('metadata_inconsistencies', 0) > 3:
        signals.append('metadata_inconsistent')
        is_synthetic = True

    return {
        'is_synthetic': is_synthetic,
        'signals': signals
    }
