# Helm Secrets Management

This directory contains encrypted secrets for the IntelGraph Helm chart, managed using tools like HashiCorp Vault or SOPS (Secrets Operations).

**DO NOT COMMIT UNENCRYPTED SECRETS TO GIT.**

## Using SOPS (Example)

1.  **Install SOPS**: Follow the official SOPS documentation for installation.
2.  **Configure SOPS**: Set up your GPG key or KMS integration.
3.  **Encrypt a file**:
    ```bash
    sops --encrypt --in-place values-secrets.yaml
    ```
4.  **Decrypt a file**:
    ```bash
    sops --decrypt values-secrets.yaml > decrypted-values-secrets.yaml
    ```
5.  **Edit a file in place**:
    ```bash
    sops values-secrets.yaml
    ```

## Using HashiCorp Vault (Example)

For more advanced secret management, integrate with HashiCorp Vault.

1.  **Vault Agent Injector**: Use the Vault Agent Injector to automatically inject secrets into Kubernetes pods.
2.  **External Secrets Operator**: Use the External Secrets Operator to sync secrets from Vault into Kubernetes Secrets.

## Best Practices

- **Least Privilege**: Ensure only necessary personnel and automated systems have access to decrypt secrets.
- **Rotation**: Regularly rotate secrets (e.g., database passwords, API keys).
- **Auditing**: Log all access and decryption of secrets for auditing purposes.
