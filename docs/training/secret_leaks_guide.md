# How to Avoid Secret Leaks in PRs

## 🛑 Stop the Leak Before It Starts

Secret leaks are a common security incident. A leaked API key or database password can compromise the entire system in minutes.

### Common Sources of Leaks
1.  **Hardcoded Values:** `const apiKey = "sk-..."` in code.
2.  **Config Files:** Committing `.env` or `config.json` with real values.
3.  **Debug Prints:** `console.log(process.env)` visible in CI logs.
4.  **Commented Out Code:** `// const token = "..."` (scanners still find this!).

### Best Practices

#### 1. Use Environment Variables
Never hardcode secrets. Use `process.env.MY_SECRET` and populate it via your platform's secret manager (e.g., GitHub Secrets, AWS Parameter Store).

**Bad:**
```typescript
const dbPassword = "supersecretpassword";
```

**Good:**
```typescript
const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) throw new Error("DB_PASSWORD is not set");
```

#### 2. `.gitignore` is Your Friend
Ensure `.env`, `*.pem`, `*.key`, and other sensitive files are in your `.gitignore`.

#### 3. Use Pre-commit Hooks
Install tools like `gitleaks` or `trufflehog` to scan your commits locally before pushing.

```bash
# Example: Install pre-commit hook
brew install pre-commit
pre-commit install
```

#### 4. Review Your Diff
Before clicking "Create Pull Request", verify your file changes. Look for any new strings that look like keys or passwords.

### What to Do If You Leak a Secret?
1.  **Don't Panic.**
2.  **Revoke it immediately.** The secret is burned. Rotating it is the only safe option.
3.  **Notify Security.** Let them help you assess if the key was used maliciously.
4.  **Rewrite History (Carefully).** If the repo is public, you may need to force-push to remove the commit trace, but assume it has already been scraped.

### Tools We Use
*   **Gitleaks:** Runs in CI to block secrets.
*   **Vault:** For managing production secrets.
*   **OIDC:** For cloud authentication without long-lived keys.
