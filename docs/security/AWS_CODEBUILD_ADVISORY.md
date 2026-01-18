# Security Advisory: AWS CodeBuild Webhook Configuration

**Date:** 2026-01-XX
**Severity:** High (if applicable)
**Reference:** "CodeBreach" Vulnerability / AWS Security Bulletin

## Summary

A security vulnerability ("CodeBreach") was disclosed regarding **unanchored regex filters** in AWS CodeBuild webhook configurations. This misconfiguration allows attackers to bypass `actor-account-id` or `head-ref` filters by crafting inputs (e.g., GitHub usernames or branch names) that *contain* the trusted value as a substring.

For example, if a filter allows `trusted-user`, an attacker named `not-trusted-user` would also pass the filter if the regex is not anchored.

## Impact

If exploited, this vulnerability could allow unauthorized users to:
1.  Trigger privileged CodeBuild builds.
2.  Extract secrets/tokens from the build environment.
3.  Poison the software supply chain by injecting malicious code into build artifacts.

## Assessment for IntelGraph/Summit

This repository includes a `buildspec.yml` template in `deploy/aws/zero-cost-enhancements.yaml`. However, **it does not automatically provision AWS CodeBuild projects** via Terraform or CloudFormation.

**If you manually created AWS CodeBuild projects** using the provided `buildspec.yml` or any other configuration, you must verify your webhook filter settings.

## Remediation & Verification

### 1. Audit your CodeBuild Projects

Run the provided audit script to check for potential vulnerabilities in your AWS account:

```bash
./scripts/security/audit_codebuild_webhooks.sh
```

### 2. Manual Verification

1.  Go to the [AWS CodeBuild Console](https://console.aws.amazon.com/codesuite/codebuild/projects).
2.  Select your project -> **Build details** -> **Primary source webhook events**.
3.  Inspect the **Start build conditions** (Filter groups).
4.  Ensure that any regex patterns for `ACTOR_ACCOUNT_ID` (GitHub User ID) or `HEAD_REF` (Branch name) are **anchored**.

**Vulnerable:**
```regex
trusted-user
```

**Secure (Anchored):**
```regex
^trusted-user$
```

### 3. Terraform Configuration

If you manage CodeBuild via Terraform, ensure your `filter_group` uses anchored regexes:

```hcl
filter_group {
  filter {
    type    = "ACTOR_ACCOUNT_ID"
    pattern = "^trusted-user$" # Good
    # pattern = "trusted-user" # Bad
  }
}
```

## Resources

*   [Wiz.io: CodeBreach Vulnerability](https://www.wiz.io/blog/wiz-research-codebreach-vulnerability-aws-codebuild)
*   [AWS Security Bulletin](https://aws.amazon.com/security/security-bulletins/)
