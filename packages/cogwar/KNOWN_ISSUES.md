# Known Issues

This document tracks known issues and blockers for the SummitCogWar project.

## 1. Persistent `ModuleNotFoundError` in Test Environment

**Status:** Resolved

**Description:**
There was a persistent and unresolved issue with the Python test environment that prevented `pytest` and other test runners from correctly discovering and importing the `summit_cog_war` package. This was caused by an invalid package name (`summit-cog-war` instead of `summit_cog_war`).

**Symptoms:**
When running tests from the repository root (e.g., `python -m pytest summit_cog_war/tests`), the test runner would fail with a `ModuleNotFoundError: No module named 'summit_cog_war'`.

**Resolution:**
The issue was resolved by renaming the package directory to `summit_cog_war` and updating all references to the old name.
