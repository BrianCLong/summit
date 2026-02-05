import os

# Multi-product platform flags
# Default to OFF for Week 1
MULTIPRODUCT_ENABLED = os.environ.get("MULTIPRODUCT_ENABLED", "false").lower() == "true"
FACTGOV_ENABLED = os.environ.get("FACTGOV_ENABLED", "false").lower() == "true"
