"""
SHAP-IQ Explainability Module
"""
import os

FEATURE_FLAG_SHAP_IQ = os.environ.get("FEATURE_FLAG_SHAP_IQ", "OFF") == "ON"
