# Security Advisory: ADVISORY-2026-001-UNANCHORED-REGEX

**Date**: 2026-01-26
**Severity**: High
**Topic**: Supply Chain Risk via Unanchored Regex in CI/CD Filters

## Executive Summary

A critical vulnerability pattern has been identified in CI/CD pipelines where regular expression (regex) filters used for authentication or authorization lack start (`^`) and end (`$`) anchors. This allows attackers with untrusted accounts or repository names that contain trusted substrings to bypass security boundaries and trigger privileged workflows.

## Background

Security researchers (Wiz Research) recently uncovered a vulnerability in AWS CodeBuild ("CodeBreach") where webhook filters for pull requests didn't require exact matches for Account IDs. Because these filters used regex without anchors, an attacker could use an Account ID that contained a trusted ID as a substring (e.g., `99123456789012` matching `123456789012`) to trigger builds that had access to sensitive credentials.

## Impact on Summit / IntelGraph

Our platform uses a combination of GitHub Actions and AWS CodeBuild (for specific "Zero-Cost Enhancements") for build and deployment processes. While most of our triggers use exact string matching (`==`), any transition to regex-based filtering or custom shell-script validation introduces the risk of substring matching.

### Potential Attack Vectors
- **Branch Filtering**: A filter for `main` might match `evil-main` if not anchored as `^main$`.
- **Actor Validation**: A check for a trusted actor `jules` might match `not-jules` if using a substring check.
- **Account ID Filtering**: In AWS CodeBuild or other multi-tenant services, unanchored Account ID matches allow unauthorized trigger execution.

## Remediation

The Summit platform is adopting a "Strict Anchoring" policy for all CI/CD filters.

1.  **Mandatory Anchoring**: All regex patterns used in `if:` conditions, webhook filters, or validation scripts MUST use `^` and `$`.
2.  **Prefer Equality**: Use exact string equality (`==` in GitHub Actions, `===` in JS) instead of regex wherever possible.
3.  **Automated Auditing**: Our security baseline now includes checks for unanchored regex patterns in CI configuration files.

## References
- Wiz Blog: [CodeBreach: Supply Chain Vuln & AWS CodeBuild](https://www.wiz.io/blog/wiz-research-codebreach-vulnerability-aws-codebuild)
- The Hacker News: [AWS CodeBuild Misconfiguration Exposed GitHub Repos](https://thehackernews.com/2026/01/aws-codebuild-misconfiguration-exposed.html)
- AWS Security Bulletin: [Unanchored ACCOUNT_ID webhook filters for CodeBuild](https://aws.amazon.com/security/security-bulletins/2026-002-AWS/)

---
**Owner**: Jules (Release Captain / Delegation Architect)
**Status**: ACTIVE
