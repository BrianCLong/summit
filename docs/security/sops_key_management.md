# SOPS Key Management Best Practices

This document outlines best practices for managing SOPS (Secrets OPerationS) keys, specifically using `age` keys, for encrypting secrets in Git and decrypting them in CI/CD pipelines and Argo CD.

## 1. Generating `age` Keys

`age` is a simple, modern, and secure file encryption tool. It's recommended for SOPS due to its simplicity and strong cryptography.

1.  **Generate a new `age` key pair:**

    ```bash
    age-keygen -o age.key
    ```

    This will create two files:
    - `age.key`: Your private key (KEEP THIS SECURE!)
    - `age.key.pub`: Your public key

2.  **Extract the public key:**
    ```bash
    cat age.key | grep public | cut -d ' ' -f 4
    ```
    The output will be a string like `age1...`. This is what you'll add to your `.sops.yaml`.

## 2. Secure Storage of Private Keys

Your `age.key` (private key) is the master key to decrypt your secrets. Its compromise means all your encrypted secrets are compromised.

- **NEVER commit private keys to Git.**
- **Offline Storage:** For maximum security, store private keys on a hardware security module (HSM), YubiKey, or an encrypted USB drive in a physically secure location (e.g., a safe).
- **Cloud KMS (Advanced):** For automated decryption in CI/CD or Kubernetes, consider integrating SOPS with a cloud Key Management Service (KMS) like AWS KMS, GCP KMS, or Azure Key Vault. This requires configuring SOPS to use the KMS provider.
- **Restricted Access:** Limit access to private keys to only authorized personnel.

## 3. `.sops.yaml` Configuration

The `.sops.yaml` file defines the encryption rules for your repository. It specifies which files to encrypt and which keys to use.

1.  **Create/Update `.sops.yaml`:**

    ```yaml
    # .sops.yaml
    creation_rules:
      - path_regex: k8s/secrets/.*\.enc\.yaml
        encrypted_regex: '^(data|stringData)$'
        age: ['age1...YOUR_PUBLIC_KEY_HERE...'] # Paste your public key here
      # Add rules for other secret files if needed
    ```

    - Replace `age1...YOUR_PUBLIC_KEY_HERE...` with the public key extracted in step 1.

## 4. Encrypting Secrets

Once `.sops.yaml` is configured, you can encrypt your secret files.

1.  **Create a Kubernetes Secret YAML (unencrypted):**

    ```yaml
    # k8s/secrets/my-app-secret.enc.yaml (example)
    apiVersion: v1
    kind: Secret
    metadata:
      name: my-app-secret
      namespace: companyos
    type: Opaque
    stringData:
      API_KEY: my-super-secret-api-key
      DB_PASSWORD: my-db-password
    ```

2.  **Encrypt the file with SOPS:**
    ```bash
    sops --encrypt --in-place k8s/secrets/my-app-secret.enc.yaml
    ```
    This will encrypt the `stringData` (or `data`) section of the YAML file. The encrypted file can now be safely committed to Git.

## 5. Decrypting Secrets

### 5.1. Local Decryption

To decrypt locally, you need access to the private key.

```bash
# Ensure your private key is accessible (e.g., in the current directory or specified via SOPS_AGE_KEY_FILE)
SOPS_AGE_KEY_FILE=age.key sops --decrypt k8s/secrets/my-app-secret.enc.yaml
```

### 5.2. CI/CD Decryption

In CI/CD pipelines (e.g., GitHub Actions), you can decrypt secrets by providing the private key as a secure environment variable.

1.  **Store Private Key:** Store the content of `age.key` as a GitHub Secret (e.g., `SOPS_AGE_KEY`).
2.  **Decrypt in Workflow:**
    ```yaml
    - name: Decrypt secrets
      env:
        SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
      run: |
        # Install sops and age if not already present
        # ...
        sops --decrypt k8s/secrets/my-app-secret.enc.yaml > k8s/secrets/my-app-secret.yaml
    ```

### 5.3. Argo CD Decryption

Argo CD can decrypt SOPS-encrypted secrets using a custom Config Management Plugin (CMP).

1.  **Install SOPS in Argo CD Repo Server:** (Already covered in `deploy/argocd/repo-server-sops-patch.yaml`)
2.  **Register CMP Plugin:** (Already covered in `deploy/argocd/cmp-sops.yaml`)
3.  **Configure Argo CD Application:** (Already covered in `deploy/argocd/apps/companyos-sops.yaml`)
4.  **Provide Private Key to Argo CD:**
    - Create a Kubernetes Secret in the `argocd` namespace containing your `age.key`.
    - Mount this secret into the `argocd-repo-server` pod.
    - **Example:**
      ```yaml
      apiVersion: v1
      kind: Secret
      metadata:
        name: sops-age-key
        namespace: argocd
      stringData:
        age.key: | # Paste content of your age.key here
          # created: 2023-01-01T00:00:00+00:00
          # public key: age1...
          AGE-SECRET-KEY-1...
      ```
      Then, patch `argocd-repo-server` deployment to mount this secret:
      ```yaml
      # deploy/argocd/repo-server-sops-key-patch.yaml
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: argocd-repo-server
        namespace: argocd
      spec:
        template:
          spec:
            volumes:
              - name: sops-age-key
                secret: { secretName: sops-age-key }
            containers:
              - name: argocd-repo-server
                volumeMounts:
                  - name: sops-age-key
                    mountPath: /home/argocd/.config/sops/age
                    readOnly: true
                env:
                  - name: SOPS_AGE_KEY_FILE
                    value: /home/argocd/.config/sops/age/age.key
      ```

## 6. Repository Layout Patterns

- **Secrets in dedicated directory:** Keep all encrypted secrets in a dedicated directory (e.g., `k8s/secrets/`) to clearly separate them from unencrypted configurations.
- **Environment-specific secrets:** Use separate encrypted files for different environments (e.g., `k8s/secrets/dev/my-app-secret.enc.yaml`, `k8s/secrets/prod/my-app-secret.enc.yaml`).
