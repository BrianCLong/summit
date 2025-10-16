---
title: ZIP Export Format Specification
summary: Technical specification for IntelGraph certified ZIP exports.
version: v1.0
owner: platform
---

## Format Version

**Current Version**: 1.0  
**Specification Date**: 2025-09-08  
**Compatibility**: IntelGraph v24+

## Archive Structure Requirements

### Mandatory Files

```
export-{timestamp}-{id}.zip
├── manifest.json          # REQUIRED - Export metadata and checksums
├── signatures/            # REQUIRED - Cryptographic signatures
│   ├── manifest.sig       # REQUIRED - Manifest signature
│   └── content.sig        # REQUIRED - Content signature
└── certificates/          # REQUIRED - Verification certificates
    ├── signing-cert.pem   # REQUIRED - Signing certificate
    └── ca-chain.pem       # REQUIRED - Certificate authority chain
```

### Optional Directories

```
├── data/                  # Exported data files
├── reports/              # Generated reports
├── media/                # Images, diagrams, attachments
└── metadata/             # Additional metadata files
```

## Manifest Schema (v1.0)

### Core Structure

```json
{
  "$schema": "https://api.intelgraph.com/schemas/export-manifest/v1.0.json",
  "version": "1.0",
  "export_id": "string",
  "timestamp": "ISO-8601 timestamp",
  "requester": "email@domain.com",
  "certification_level": "public|confidential|secret",
  "files": [
    {
      "path": "relative/path/to/file",
      "size": 1024,
      "checksum": "sha256:hex-encoded-hash",
      "mime_type": "application/json"
    }
  ],
  "signatures": {
    "algorithm": "RSA-SHA256|RSA-SHA512|ECDSA-SHA256",
    "certificate_fingerprint": "hex:encoded:fingerprint",
    "manifest_signature": "base64-encoded-signature",
    "content_signature": "base64-encoded-signature"
  },
  "metadata": {
    "export_scope": ["entities", "relationships", "reports"],
    "date_range": {
      "start": "ISO-8601 timestamp",
      "end": "ISO-8601 timestamp"
    },
    "filters": {},
    "total_size": 1048576,
    "compression": "deflate"
  }
}
```

### Required Fields

| Field                 | Type   | Description               | Validation                   |
| --------------------- | ------ | ------------------------- | ---------------------------- |
| `version`             | string | Manifest format version   | Must be "1.0"                |
| `export_id`           | string | Unique export identifier  | 32-char hex string           |
| `timestamp`           | string | Export creation time      | RFC 3339 format              |
| `requester`           | string | User who requested export | Valid email address          |
| `certification_level` | enum   | Security classification   | public, confidential, secret |
| `files`               | array  | List of files in archive  | Non-empty array              |
| `signatures`          | object | Cryptographic signatures  | See signature schema         |

### Signature Schema

```json
{
  "algorithm": "RSA-SHA256",
  "certificate_fingerprint": "12:34:56:78:90:ab:cd:ef:12:34:56:78:90:ab:cd:ef:12:34:56:78",
  "manifest_signature": "base64-encoded-RSA-signature-of-manifest-without-signatures-field",
  "content_signature": "base64-encoded-RSA-signature-of-concatenated-file-contents"
}
```

### File Entry Schema

```json
{
  "path": "data/entities.json",
  "size": 1024576,
  "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "mime_type": "application/json",
  "created_at": "2025-09-08T10:30:00Z",
  "permissions": "0644"
}
```

## Signature Requirements

### Certification Level Requirements

| Level        | Algorithm  | Key Size  | HSM Required | Timestamp |
| ------------ | ---------- | --------- | ------------ | --------- |
| Public       | RSA-SHA256 | 2048 bits | No           | Optional  |
| Confidential | RSA-SHA256 | 4096 bits | No           | Required  |
| Secret       | RSA-SHA512 | 4096 bits | Yes          | Required  |

### Signature Generation Process

1. **Manifest Signature**

   ```bash
   # Create manifest without signatures field
   jq 'del(.signatures)' manifest.json > manifest-unsigned.json

   # Generate signature
   openssl dgst -sha256 -sign private.key manifest-unsigned.json | base64 -w0
   ```

2. **Content Signature**

   ```bash
   # Concatenate all file contents in path order
   find data/ -type f | sort | xargs cat > content.bin

   # Generate signature
   openssl dgst -sha256 -sign private.key content.bin | base64 -w0
   ```

## Certificate Requirements

### Certificate Chain

- **Root CA**: Self-signed certificate authority
- **Intermediate CA**: Signed by root, issues signing certificates
- **Signing Certificate**: Used to sign exports, issued by intermediate

### Required Extensions

```
Key Usage: Digital Signature, Non Repudiation
Extended Key Usage: Code Signing, Document Signing
Subject Alternative Name: email:user@domain.com
Authority Information Access: OCSP responder URL
CRL Distribution Points: Certificate revocation list URL
```

### Certificate Validation

```bash
# Verify certificate chain
openssl verify -CAfile ca-chain.pem signing-cert.pem

# Check certificate validity
openssl x509 -in signing-cert.pem -noout -dates

# Verify key usage extensions
openssl x509 -in signing-cert.pem -noout -text | grep -A5 "Key Usage"
```

## File Naming Convention

### Archive Names

```
export-{YYYY-MM-DD-HH-mm-ss}-{export-id}.zip
```

Examples:

- `export-2025-09-08-10-30-15-abc123def456.zip`
- `export-2025-09-08-14-22-03-xyz789uvw012.zip`

### Internal File Paths

- Use forward slashes for path separators
- No leading slash in paths
- UTF-8 encoding for filenames
- Maximum path length: 260 characters

## Compression Requirements

### Archive Compression

- **Method**: DEFLATE (ZIP standard)
- **Level**: 6 (balanced compression/speed)
- **Maximum Archive Size**: 10 GB
- **Maximum File Count**: 10,000 files

### File Type Handling

```yaml
no_compression:
  - '*.jpg'
  - '*.png'
  - '*.zip'
  - '*.gz'

max_compression:
  - '*.json'
  - '*.xml'
  - '*.txt'
  - '*.md'
```

## Validation Rules

### Archive Validation

1. Archive must be valid ZIP format
2. All required files must be present
3. Manifest JSON must validate against schema
4. File checksums must match manifest entries
5. Signatures must verify with included certificates

### Content Validation

```javascript
// Pseudocode validation logic
function validateExport(archive) {
  // Extract and validate manifest
  const manifest = JSON.parse(archive.readFile('manifest.json'));
  validateSchema(manifest, manifestSchema);

  // Verify all listed files exist
  for (const file of manifest.files) {
    if (!archive.hasFile(file.path)) {
      throw new Error(`Missing file: ${file.path}`);
    }

    // Verify file checksum
    const content = archive.readFile(file.path);
    const actualHash = sha256(content);
    if (actualHash !== file.checksum.replace('sha256:', '')) {
      throw new Error(`Checksum mismatch: ${file.path}`);
    }
  }

  // Verify signatures
  const cert = archive.readFile('certificates/signing-cert.pem');
  const manifestSig = archive.readFile('signatures/manifest.sig');
  if (!verifySignature(manifest, manifestSig, cert)) {
    throw new Error('Manifest signature verification failed');
  }

  return { valid: true, level: manifest.certification_level };
}
```

## Error Handling

### Validation Errors

```json
{
  "error": "VALIDATION_FAILED",
  "code": "E_CHECKSUM_MISMATCH",
  "message": "File checksum does not match manifest",
  "details": {
    "file": "data/entities.json",
    "expected": "sha256:abc123...",
    "actual": "sha256:def456..."
  }
}
```

### Common Error Codes

- `E_MANIFEST_MISSING`: manifest.json not found
- `E_SIGNATURE_MISSING`: Required signature file missing
- `E_CERTIFICATE_INVALID`: Certificate validation failed
- `E_CHECKSUM_MISMATCH`: File checksum verification failed
- `E_SIGNATURE_INVALID`: Signature verification failed
- `E_SCHEMA_INVALID`: Manifest doesn't match schema

## Compatibility

### Version Compatibility

- **v1.0**: Current version, IntelGraph v24+
- **v0.9**: Legacy format, deprecated in v24
- **v2.0**: Planned for v26, will add encryption support

### Migration Path

```bash
# Convert legacy export to v1.0
intelgraph export migrate --input legacy-export.zip --output v1-export.zip

# Validate converted export
intelgraph export validate --input v1-export.zip --strict
```

## Implementation Examples

### Creating Compliant Export (Node.js)

```javascript
const fs = require('fs');
const crypto = require('crypto');
const forge = require('node-forge');

async function createCompliantExport(files, options) {
  const exportId = crypto.randomBytes(16).toString('hex');
  const timestamp = new Date().toISOString();

  // Calculate file checksums
  const fileEntries = files.map((file) => ({
    path: file.path,
    size: file.content.length,
    checksum: `sha256:${crypto.createHash('sha256').update(file.content).digest('hex')}`,
    mime_type: file.mimeType,
  }));

  // Create manifest
  const manifest = {
    version: '1.0',
    export_id: exportId,
    timestamp: timestamp,
    requester: options.requester,
    certification_level: options.level,
    files: fileEntries,
    metadata: options.metadata,
  };

  // Sign manifest and content
  const signatures = await signExport(manifest, files, options.privateKey);
  manifest.signatures = signatures;

  // Create ZIP archive
  const archive = new JSZip();
  archive.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Add files
  files.forEach((file) => {
    archive.file(file.path, file.content);
  });

  // Add certificates and signatures
  archive.file('certificates/signing-cert.pem', options.certificate);
  archive.file('certificates/ca-chain.pem', options.caChain);
  archive.file('signatures/manifest.sig', signatures.manifest_signature);
  archive.file('signatures/content.sig', signatures.content_signature);

  return archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
```

## Security Considerations

### Threat Model

- **Tampered Archives**: Mitigated by signature verification
- **Forged Certificates**: Mitigated by certificate chain validation
- **Replay Attacks**: Mitigated by timestamp validation
- **Man-in-the-Middle**: Mitigated by HTTPS transport

### Best Practices

1. Always verify certificate chain to trusted root
2. Check certificate revocation status (OCSP/CRL)
3. Validate timestamp is within acceptable range
4. Use secure random number generator for export IDs
5. Store private keys in hardware security modules for secret level

---

**Specification Maintainer**: Platform Team  
**Last Updated**: 2025-09-08  
**Next Review**: 2025-12-08
