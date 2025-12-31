# Summit GA Drift Model

> **Version**: 1.0
> **Last Updated**: 2026-01-15
> **Status**: GA-Ready
> **Audience**: SRE, DevOps, Security, Compliance

---

## 1. Executive Summary

This document defines the **drift model** for the Summit platform at General Availability (GA). Drift is any unauthorized or untracked change to a production system. This model outlines the classes of drift we monitor, the detection mechanisms, and the response procedures to ensure the stability, security, and compliance of our GA releases.

**Core Principle**: "What is in Git is what is in production. Any deviation is an incident."

---

## 2. Drift Classes

We monitor four primary classes of drift.

### 2.1 Dependency Drift

*   **Description**: Any change to the application's dependencies, as defined in the `pnpm-lock.yaml` file. This includes additions, removals, or version changes of any package.
*   **Risk**: Unvetted dependencies can introduce security vulnerabilities, performance issues, or instability.
*   **Detection**: A SHA256 hash of the `pnpm-lock.yaml` file is taken at release time and stored as a baseline. The `detect-drift.sh` script compares the hash of the current lockfile against this baseline.
*   **Response**:
    1.  An alert is fired to the on-call SRE and security teams.
    2.  The change is investigated to determine if it was intentional.
    3.  If unauthorized, the change is reverted, and an investigation is launched.
    4.  If authorized (e.g., a hotfix), the baseline is updated after a security review.

### 2.2 Configuration Drift

*   **Description**: Any change to critical configuration files, such as Helm `values.yaml` or production-specific configurations.
*   **Risk**: Misconfigurations can lead to outages, security vulnerabilities (e.g., exposing a service publicly), or performance degradation.
*   **Detection**: SHA256 hashes of critical configuration files are stored as a baseline. The `detect-drift.sh` script compares the hashes of the current files against this baseline.
*   **Response**:
    1.  An alert is fired to the on-call SRE.
    2.  The change is immediately investigated.
    3.  If the change is unauthorized, it is reverted to the baseline version.
    4.  A post-mortem is conducted to understand how the unauthorized change occurred.

### 2.3 Policy Drift

*   **Description**: Any change to Open Policy Agent (OPA) policies, including authentication, authorization, and rate-limiting rules.
*   **Risk**: Unauthorized policy changes can lead to security breaches, data exfiltration, or denial of service.
*   **Detection**: SHA256 hashes of all `.rego` policy files are stored as a baseline. The `detect-drift.sh` script compares the hashes of the current policy files against this baseline.
*   **Response**:
    1.  A critical alert is fired to the security and SRE teams.
    2.  The system may be automatically placed into a "lockdown" mode, where all policy-controlled actions are denied.
    3.  The policy changes are reverted to the baseline.
    4.  A full security investigation is launched.

### 2.4 CI/Workflow Drift

*   **Description**: Any change to the critical CI/CD workflows that govern the GA release and quality gates (e.g., `ga-release.yml`, `pr-quality-gate.yml`).
*   **Risk**: Changes to these workflows could weaken security checks, bypass required approvals, or introduce vulnerabilities into the release process itself.
*   **Detection**: SHA256 hashes of critical workflow files are stored as a baseline. The `detect-drift.sh` script compares the hashes of the current workflow files against this baseline.
*   **Response**:
    1.  A critical alert is fired to the security and SRE teams.
    2.  The CI/CD system is immediately paused to prevent any further builds or deployments.
    3.  The workflow changes are reverted to the baseline.
    4.  A security audit of all recent builds is conducted.

---

## 3. Automation and Scheduling

*   The `detect-drift.sh` script is the primary tool for drift detection.
*   This script is run on a **daily schedule** via a GitHub Actions workflow (`drift-detection.yml`).
*   It can also be triggered manually by an on-call engineer at any time.
*   The script outputs a clear pass/fail signal. Any failure results in a P1 incident being created automatically.

---

This drift model is a critical component of our post-GA operational strategy. It provides a mechanically enforced guarantee that our production environment remains in a known, trusted state.
