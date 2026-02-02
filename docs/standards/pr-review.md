# PR Review Standards

## Principles
*   **No direct commits to main**. All changes must go through a Pull Request.
*   **Single Responsibility**: PRs should focus on one logical change.
*   **Execution Governor Check**: Reviewers must verify that "Single Product Mode" is respected.
*   **Customer Impact**: Every PR must state its impact on the customer (even internal ones).

## Review Checklist
1.  **Scope Guardrail**: Does this PR touch frozen product code? If so, is an override included?
2.  **Customer Impact**: Is the impact clearly stated in the description?
3.  **Tests**: Are there unit tests? Do they cover the new logic?
4.  **Rollback**: Is there a plan to revert this if it breaks production?
5.  **Docs**: Are relevant docs updated (especially runbooks)?

## Approval
*   At least one approval required from a code owner.
*   "LGTM" is not enough; providing specific feedback or questions is encouraged.
