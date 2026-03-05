"""
SHAP-IQ JSON Schema Validation
"""
# Placeholder for formal schema validation
REPORT_SCHEMA = {
    "type": "object",
    "required": ["evidence_id", "feature_importance", "interaction_matrix", "decision_breakdown"],
    "properties": {
        "evidence_id": {"type": "string"},
        "feature_importance": {"type": "array"},
        "interaction_matrix": {"type": "array"},
        "decision_breakdown": {"type": "array"}
    }
}
