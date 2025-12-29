# Security Policy

Summit/IntelGraph takes security seriously. We employ a Zero Trust architecture with rigorous automated scanning.

## 🛡️ Reporting Vulnerabilities

**Do not open public GitHub issues for security vulnerabilities.**

Please report suspected vulnerabilities privately to:
**security@summit.com**

Include:

- Affected component (e.g., API, AuthZ, Gateway).
- Reproduction steps.
- Potential impact.

## 📦 Supported Versions

| Version              | Supported | Notes                                |
| :------------------- | :-------- | :----------------------------------- |
| **v2.0.x** (Current) | ✅        | Enterprise Integration Release       |
| **v1.x**             | ⚠️        | Critical fixes only (until Dec 2026) |
| **< v1.0**           | ❌        | End of Life                          |

## 🔐 Security Architecture

For details on our security model (AuthN, AuthZ, OPA, RBAC), please see:
**[Security Model Documentation](docs/concepts/security-model.md)**

## 🚫 Secrets Policy

- **No Secrets in Code**: We enforce this via `gitleaks` in CI.
- **Rotation**: If a credential is exposed, it must be rotated immediately.
- **Management**: Use `.env` for local dev and Kubernetes Secrets for production.
