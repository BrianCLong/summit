CRITICAL_SEVERITY_REQUIRES_REVIEW = True
HIGH_SEVERITY_REQUIRES_REVIEW = True
MIN_CONFIDENCE_AUTO_PUBLISH = 0.9

def requires_review(warning: dict) -> bool:
    if warning.get("hitl_required", False):
        return True

    # Check warning data if hitl_required not explicitly set
    indicators = warning.get("indicators", [])
    severities = [ind.get("severity", "low") for ind in indicators]

    if "critical" in severities and CRITICAL_SEVERITY_REQUIRES_REVIEW:
        return True
    if "high" in severities and HIGH_SEVERITY_REQUIRES_REVIEW:
        return True

    confidence = warning.get("confidence", 0.0)
    if confidence < MIN_CONFIDENCE_AUTO_PUBLISH:
        return True # Low confidence requires human check

    return False
