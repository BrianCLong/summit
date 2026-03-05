# Multi-Cloud Data Handling Policy

When utilizing multiple cloud providers to ensure system resilience, stringent data handling guidelines must be enforced to maintain security, compliance, and prevent data leakage.

## Guidelines

- **Never log API keys or cloud credentials:** Avoid hardcoding or inadvertently logging access keys, secrets, or any credential data when interacting with different cloud providers. Use environment variables and secure secret management tools.
- **Never log embedding payloads:** Data representing embeddings should be considered sensitive and should never be exposed in plaintext within standard application or operational logs.
- **Never log user prompts:** Protect user privacy by not storing or logging raw user prompts or inputs. Only hashed or suitably anonymized data should be retained when necessary.

## Retention Policy

- **Metrics:** 30 days
- **Audit logs:** 90 days

Compliance with these policies ensures that moving between different cloud providers does not introduce additional security vulnerabilities or violate data governance standards.
