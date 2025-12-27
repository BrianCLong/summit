# STRIDE Threat Model: Export & Download Pipeline

**Document Version**: 1.0
**Date**: 2025-12-27
**Status**: Active
**Owner**: Security Team
**Review Cadence**: Quarterly

---

## Executive Summary

The Export & Download Pipeline enables intelligence analysts to extract data, reports, and artifacts from the Summit/IntelGraph platform for offline analysis, sharing with partners, or archival. This threat model identifies 20 distinct threats that could compromise data classification enforcement, watermarking, audit trails, or Data Loss Prevention (DLP) controls during export operations.

**Key Risk Areas**:

- Classification label downgrade to export restricted data
- Watermark removal or bypass on exported documents
- Audit trail bypass for bulk export operations
- Manifest tampering to hide exported content
- DLP policy bypass through alternative export channels
- Unencrypted exports containing classified information

**Critical Gaps**:

- Export manifest signing is optional, not mandatory
- Bulk export lacks multi-party approval workflow
- Watermarking not enforced for all export formats
- DLP integration is advisory, not blocking
- No real-time export monitoring or anomaly detection
- Encrypted exports lack key escrow for recovery

**Overall Risk Rating**: HIGH (Data exfiltration is critical security concern)

---

## System Overview

### Components in Scope

```
┌──────────────────────────────────────────────────────────────────┐
│                    Export & Download Pipeline                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────────┐  │
│  │   Export     │─────▶│  Export      │─────▶│  Watermark     │  │
│  │   Request    │      │  Orchestrator│      │   Service      │  │
│  └──────────────┘      └──────────────┘      └────────────────┘  │
│         │                      │                      │           │
│         │                      ▼                      ▼           │
│         │              ┌──────────────┐      ┌────────────────┐  │
│         │              │     DLP      │      │  Classification│  │
│         │              │   Scanner    │      │   Validator    │  │
│         │              └──────────────┘      └────────────────┘  │
│         ▼                      │                      │           │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────────┐  │
│  │  Approval    │      │  Manifest    │      │   Encryption   │  │
│  │  Workflow    │      │  Generator   │      │   Service      │  │
│  └──────────────┘      └──────────────┘      └────────────────┘  │
│         │                      │                      │           │
│         └──────────────────────┴──────────────────────┘           │
│                                │                                  │
│                                ▼                                  │
│                        ┌──────────────┐                           │
│                        │  Export File │                           │
│                        │  (S3/Local)  │                           │
│                        └──────────────┘                           │
│                                │                                  │
│                                ▼                                  │
│                        ┌──────────────┐                           │
│                        │  Audit Log   │                           │
│                        │ (Immutable)  │                           │
│                        └──────────────┘                           │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

Trust Boundaries:
═════════════════════════════════════════════════════════════════════
  [Analyst] ─────▶ [Export API] ─────▶ [Export Orchestrator]
            TB-1               TB-2

  [Export Orchestrator] ─────▶ [DLP Scanner] ─────▶ [Export Storage]
                        TB-3               TB-4

  [Export Storage] ─────▶ [Download Endpoint] ─────▶ [End User]
                   TB-5                      TB-6

TB-1: Authentication boundary (OIDC/JWT, MFA)
TB-2: Authorization boundary (ABAC policy check)
TB-3: DLP boundary (content inspection)
TB-4: Encryption boundary (AES-256-GCM)
TB-5: Storage boundary (access control, encryption at rest)
TB-6: Network boundary (TLS 1.3, certificate pinning)
```

### Data Flow

1. **Export Request**: Analyst → Export API → Authorization Check → DLP Scan
2. **Classification Validation**: Export Orchestrator → Validate Labels → Check Clearance
3. **Approval (Bulk)**: High-volume export → Approval Workflow → Multi-party Approval
4. **Watermarking**: Document → Watermark Service → Embed User ID + Timestamp
5. **Encryption**: Export File → Encryption Service → AES-256-GCM → Store Key
6. **Manifest Generation**: Export Contents → Manifest Generator → Sign Manifest → Attach
7. **Download**: User → Download Endpoint → Verify Token → Stream File → Audit Log

---

## Threat Analysis

### STRIDE Categories

| Category                   | Threat Count | Critical | High   | Medium | Low   |
| -------------------------- | ------------ | -------- | ------ | ------ | ----- |
| **Spoofing**               | 2            | 0        | 2      | 0      | 0     |
| **Tampering**              | 6            | 2        | 3      | 1      | 0     |
| **Repudiation**            | 3            | 1        | 2      | 0      | 0     |
| **Information Disclosure** | 5            | 2        | 2      | 1      | 0     |
| **Denial of Service**      | 2            | 0        | 1      | 1      | 0     |
| **Elevation of Privilege** | 2            | 1        | 1      | 0      | 0     |
| **Total**                  | **20**       | **6**    | **11** | **3**  | **0** |

---

## Detailed Threat Inventory

### Spoofing (S)

| ID       | Threat                         | Description                                                                    | Impact | Likelihood | Risk Score | Mitigation                                                                                                                                                                            | Status  |
| -------- | ------------------------------ | ------------------------------------------------------------------------------ | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **S-01** | Export Requester Impersonation | Attacker uses stolen JWT or session token to request export as privileged user | 4      | 3          | 12 (High)  | Implement MFA for sensitive exports; validate user context (IP, device fingerprint); require short-lived tokens; implement session binding; audit all export requests                 | Partial |
| **S-02** | Download Link Spoofing         | Attacker generates fake pre-signed download URL to phish users or bypass audit | 4      | 3          | 12 (High)  | Use cryptographically signed download tokens (HMAC-SHA256); implement short TTL (15 minutes); validate referrer; implement download token replay detection; audit all download events | Partial |

---

### Tampering (T)

| ID       | Threat                         | Description                                                                                        | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                                                             | Status          |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **T-01** | Classification Label Downgrade | Attacker modifies classification label (e.g., SECRET → UNCLASSIFIED) to bypass export restrictions | 5      | 4          | 20 (Critical) | Validate classification labels against source data; implement label integrity checks (HMAC); audit all label changes; use immutable classification metadata; require multi-party approval for downgrade                                | Partial         |
| **T-02** | Watermark Removal              | Attacker removes or obfuscates watermark from exported document to hide identity                   | 5      | 4          | 20 (Critical) | **CRITICAL GAP**: Implement robust watermarking (steganography, PDF metadata, pixel patterns); use multiple watermark layers; validate watermark integrity before export; detect watermark removal attempts; use forensic watermarking | Partial         |
| **T-03** | Export Manifest Tampering      | Attacker modifies export manifest to hide files or change metadata                                 | 4      | 4          | 16 (High)     | **CRITICAL GAP**: Make manifest signing mandatory (Ed25519, RSA-PSS); verify signature before processing; use tamper-evident manifest format (JSON-LD with signatures); audit manifest integrity failures                              | Not Implemented |
| **T-04** | Encryption Key Substitution    | Attacker replaces export encryption key with own key to decrypt later                              | 4      | 2          | 8 (Medium)    | Use HSM or KMS for key generation; implement key derivation from user context; audit all key operations; use ephemeral keys with key escrow for recovery; validate key ownership                                                       | Partial         |
| **T-05** | Export File Injection          | Attacker injects malicious files into export package (e.g., malware, scripts)                      | 3      | 3          | 9 (Medium)    | Scan export contents for malware (ClamAV, VirusTotal); validate file types against whitelist; implement content integrity checks; sandbox file processing; audit all exported files                                                    | Partial         |
| **T-06** | DLP Policy Bypass Tampering    | Attacker modifies DLP rules or disables scanner to bypass content inspection                       | 5      | 3          | 15 (High)     | Implement immutable DLP policies; separate DLP service from export pipeline; use policy signing; audit DLP policy changes; require multi-party approval for policy modifications                                                       | Partial         |

---

### Repudiation (R)

| ID       | Threat                     | Description                                                                            | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                                  | Status  |
| -------- | -------------------------- | -------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **R-01** | Export Audit Log Bypass    | Attacker disables or deletes audit logs to hide export activity                        | 5      | 3          | 15 (Critical) | Implement write-once audit logs (WORM storage); use separate audit database with restricted access; replicate logs to SIEM in real-time; audit log deletion attempts; use blockchain for log integrity      | Partial |
| **R-02** | Download Denial            | User denies downloading exported file despite access logs                              | 4      | 3          | 12 (High)     | Implement non-repudiation signatures on download actions; log user authentication proof (JWT claims); use device fingerprinting; require explicit consent for download; store cryptographic proof of access | Partial |
| **R-03** | Export Attribution Failure | Unable to determine who initiated export due to shared credentials or service accounts | 4      | 4          | 16 (High)     | Prohibit shared credentials for export operations; require individual user authentication; implement service account approval workflow; audit all export initiations; use provenance ledger for attribution | Partial |

---

### Information Disclosure (I)

| ID       | Threat                              | Description                                                                              | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                         | Status      |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **I-01** | Unencrypted Export Transmission     | Exported file transmitted over unencrypted channel (HTTP vs HTTPS)                       | 5      | 2          | 10 (High)     | Enforce TLS 1.3 for all downloads; implement certificate pinning; use HSTS headers; disable HTTP endpoints in production; audit all download connections                                           | Implemented |
| **I-02** | Export Storage Exposure             | Exported files stored in publicly accessible S3 bucket or file share                     | 5      | 3          | 15 (Critical) | Implement least-privilege bucket policies; disable public access; use pre-signed URLs with short TTL; encrypt exports at rest (S3 SSE-KMS); audit bucket access logs; use VPC endpoints for S3     | Partial     |
| **I-03** | Classification Label Leakage        | Classification labels visible in export filename, URL, or metadata to unauthorized users | 3      | 4          | 12 (Medium)   | Sanitize filenames (use UUIDs); redact classification from URLs; encrypt export metadata; use generic download endpoints; implement access control on metadata retrieval                           | Partial     |
| **I-04** | DLP Scanner Bypass                  | Sensitive content (PII, SSN, credit cards) not detected by DLP scanner                   | 5      | 4          | 20 (Critical) | **CRITICAL GAP**: Make DLP blocking, not advisory; use multiple DLP engines (regex + ML); implement custom patterns for IC data; test DLP with synthetic sensitive data; audit DLP bypass attempts | Partial     |
| **I-05** | Export Manifest Information Leakage | Export manifest reveals system internals (file paths, database IDs, service names)       | 3      | 3          | 9 (Medium)    | Sanitize manifest content; use logical names instead of internal IDs; redact system paths; implement manifest access control; audit manifest downloads                                             | Partial     |

---

### Denial of Service (D)

| ID       | Threat                       | Description                                                                  | Impact | Likelihood | Risk Score | Mitigation                                                                                                                                                                                    | Status  |
| -------- | ---------------------------- | ---------------------------------------------------------------------------- | ------ | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **D-01** | Export Storage Exhaustion    | Attacker creates large or numerous exports to exhaust storage quota          | 4      | 3          | 12 (High)  | Implement per-user export quotas (size + count); use temporary storage with auto-expiration (7 days); implement export size limits; monitor storage usage; use lifecycle policies for cleanup | Partial |
| **D-02** | DLP Scan Resource Exhaustion | Large export files (multi-GB) cause DLP scanner timeout or memory exhaustion | 3      | 3          | 9 (Medium) | Implement file size limits for DLP scanning (e.g., 500MB); use streaming DLP analysis; set scan timeouts; implement circuit breakers; scale DLP workers horizontally                          | Partial |

---

### Elevation of Privilege (E)

| ID       | Threat                      | Description                                                          | Impact | Likelihood | Risk Score    | Mitigation                                                                                                                                                                                                                               | Status          |
| -------- | --------------------------- | -------------------------------------------------------------------- | ------ | ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **E-01** | Bulk Export Approval Bypass | Attacker exports large dataset without required multi-party approval | 5      | 4          | 20 (Critical) | **CRITICAL GAP**: Implement mandatory approval workflow for bulk exports (threshold: 1000 entities or 100MB); require multi-party approval for high-classification exports; audit approval bypasses; use policy enforcement at API layer | Not Implemented |
| **E-02** | Clearance Level Bypass      | User with CONFIDENTIAL clearance exports SECRET-level data           | 5      | 3          | 15 (High)     | Validate user clearance against maximum classification in export; implement clearance checking at multiple layers (API, orchestrator, DLP); audit clearance violations; use ABAC policies for clearance enforcement                      | Partial         |

---

## Critical Gaps Summary

### 1. Export Manifest Signing Not Enforced (T-03)

**Gap**: Export manifests are generated but signature verification is optional, allowing tampering.

**Risk**: Attacker can modify manifest to hide exported files or change metadata without detection.

**Recommendation**:

```typescript
// Mandatory manifest signing
interface ExportManifest {
  version: string;
  export_id: string;
  timestamp: string;
  files: Array<{
    name: string;
    size: number;
    hash: string;
    classification: string;
  }>;
  signature?: string; // Make required
  signer_key_id?: string; // Make required
}

class ExportManifestGenerator {
  async generate(exportData: ExportData): Promise<ExportManifest> {
    const manifest = {
      version: "1.0",
      export_id: exportData.id,
      timestamp: new Date().toISOString(),
      files: exportData.files.map((f) => ({
        name: f.name,
        size: f.size,
        hash: crypto.createHash("sha256").update(f.content).digest("hex"),
        classification: f.classification,
      })),
    };

    // MANDATORY: Sign manifest
    const signature = await this.signatureService.sign(
      JSON.stringify(manifest),
      "export-manifest-key"
    );

    return {
      ...manifest,
      signature: signature.value,
      signer_key_id: signature.keyId,
    };
  }

  async verify(manifest: ExportManifest): Promise<boolean> {
    if (!manifest.signature || !manifest.signer_key_id) {
      throw new Error("Manifest signature required");
    }

    const { signature, signer_key_id, ...data } = manifest;

    const isValid = await this.signatureService.verify(
      JSON.stringify(data),
      signature,
      signer_key_id
    );

    if (!isValid) {
      await this.auditLog.record({
        event: "manifest_signature_invalid",
        export_id: manifest.export_id,
        severity: "critical",
      });
      throw new Error("Manifest signature verification failed");
    }

    return true;
  }
}

// Production guardrail
if (process.env.NODE_ENV === "production") {
  if (!config.export.requireSignedManifest) {
    throw new Error("Signed manifests required in production");
  }
}
```

**Priority**: P0 (Critical security control)

---

### 2. Bulk Export Lacks Approval Workflow (E-01)

**Gap**: No multi-party approval required for high-volume or high-classification exports.

**Risk**: Insider threat or compromised account can exfiltrate large datasets without oversight.

**Recommendation**:

```typescript
// Approval workflow for bulk exports
class ExportApprovalService {
  private readonly BULK_THRESHOLD = {
    entity_count: 1000,
    file_size_mb: 100,
    classification: ["SECRET", "TOP_SECRET"],
  };

  async requiresApproval(exportRequest: ExportRequest): Promise<boolean> {
    // Check entity count
    if (exportRequest.entity_count >= this.BULK_THRESHOLD.entity_count) {
      return true;
    }

    // Check file size
    const sizeMB = exportRequest.estimated_size / (1024 * 1024);
    if (sizeMB >= this.BULK_THRESHOLD.file_size_mb) {
      return true;
    }

    // Check classification
    if (
      exportRequest.max_classification &&
      this.BULK_THRESHOLD.classification.includes(exportRequest.max_classification)
    ) {
      return true;
    }

    return false;
  }

  async requestApproval(exportRequest: ExportRequest): Promise<string> {
    const approvalWorkflow = await this.workflowService.create({
      type: "bulk_export_approval",
      requester: exportRequest.user_id,
      approvers: await this.getApprovers(exportRequest),
      metadata: {
        export_id: exportRequest.id,
        entity_count: exportRequest.entity_count,
        estimated_size: exportRequest.estimated_size,
        max_classification: exportRequest.max_classification,
      },
      expiration: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    await this.notifyApprovers(approvalWorkflow);

    return approvalWorkflow.id;
  }

  private async getApprovers(request: ExportRequest): Promise<string[]> {
    // Require 2 approvers for bulk exports
    const eligibleApprovers = await this.userService.findByRole("data_custodian");

    // Exclude requester
    return eligibleApprovers
      .filter((user) => user.id !== request.user_id)
      .slice(0, 2)
      .map((user) => user.id);
  }
}

// API layer enforcement
app.post("/api/exports", async (req, res) => {
  const exportRequest = req.body;

  // Check if approval required
  if (await approvalService.requiresApproval(exportRequest)) {
    const workflowId = await approvalService.requestApproval(exportRequest);

    return res.status(202).json({
      message: "Export requires approval",
      workflow_id: workflowId,
      status: "pending_approval",
    });
  }

  // Proceed with export
  const exportId = await exportService.create(exportRequest);
  res.json({ export_id: exportId });
});
```

**Priority**: P0 (Insider threat mitigation)

---

### 3. Watermarking Not Enforced for All Formats (T-02)

**Gap**: Watermarking only applied to PDFs and images, not to CSV, JSON, or other data exports.

**Risk**: Exported data can be shared without attribution, hindering leak investigation.

**Recommendation**:

```typescript
// Universal watermarking strategy
class UniversalWatermarkService {
  private strategies = {
    pdf: new PDFWatermarkStrategy(),
    image: new ImageWatermarkStrategy(),
    csv: new CSVWatermarkStrategy(),
    json: new JSONWatermarkStrategy(),
    text: new TextWatermarkStrategy(),
  };

  async watermark(file: Buffer, format: string, metadata: WatermarkMetadata): Promise<Buffer> {
    const strategy = this.strategies[format];

    if (!strategy) {
      throw new Error(`Watermarking not supported for format: ${format}`);
    }

    return strategy.apply(file, metadata);
  }
}

// CSV watermarking: Add hidden row with metadata
class CSVWatermarkStrategy {
  apply(file: Buffer, metadata: WatermarkMetadata): Buffer {
    const csv = file.toString("utf-8");
    const lines = csv.split("\n");

    // Insert watermark as comment row (Excel/CSV parsers ignore)
    const watermark = `# EXPORT_METADATA: user=${metadata.user_id}, timestamp=${metadata.timestamp}, export_id=${metadata.export_id}`;

    lines.splice(1, 0, watermark);

    return Buffer.from(lines.join("\n"), "utf-8");
  }
}

// JSON watermarking: Add metadata field
class JSONWatermarkStrategy {
  apply(file: Buffer, metadata: WatermarkMetadata): Buffer {
    const data = JSON.parse(file.toString("utf-8"));

    // Add watermark metadata
    const watermarked = {
      _watermark: {
        user_id: metadata.user_id,
        timestamp: metadata.timestamp,
        export_id: metadata.export_id,
        classification: metadata.classification,
      },
      ...data,
    };

    return Buffer.from(JSON.stringify(watermarked, null, 2), "utf-8");
  }
}

// Production enforcement
if (process.env.NODE_ENV === "production") {
  if (!config.export.enforceWatermarking) {
    throw new Error("Watermarking must be enabled in production");
  }

  // Validate all formats have watermarking strategy
  const supportedFormats = Object.keys(watermarkService.strategies);
  const allowedExportFormats = config.export.allowedFormats;

  const unsupported = allowedExportFormats.filter((f) => !supportedFormats.includes(f));
  if (unsupported.length > 0) {
    throw new Error(`Watermarking not implemented for: ${unsupported.join(", ")}`);
  }
}
```

**Priority**: P0 (Data loss prevention)

---

### 4. DLP Integration is Advisory, Not Blocking (I-04)

**Gap**: DLP scanner results are logged but don't prevent export of sensitive data.

**Risk**: PII, classified markings, or sensitive content can be exported without detection.

**Recommendation**:

```typescript
// Blocking DLP enforcement
class DLPEnforcementService {
  private readonly MAX_RISK_SCORE = 7.0; // 0-10 scale

  async scan(file: Buffer, metadata: FileMetadata): Promise<DLPResult> {
    // Run multiple DLP engines in parallel
    const [regexResults, mlResults, customResults] = await Promise.all([
      this.regexDLP.scan(file),
      this.mlDLP.scan(file),
      this.customPatternDLP.scan(file, metadata.classification),
    ]);

    // Aggregate results
    const allFindings = [
      ...regexResults.findings,
      ...mlResults.findings,
      ...customResults.findings,
    ];

    const riskScore = this.calculateRiskScore(allFindings);

    return {
      allowed: riskScore < this.MAX_RISK_SCORE,
      risk_score: riskScore,
      findings: allFindings,
    };
  }

  private calculateRiskScore(findings: DLPFinding[]): number {
    // Weighted scoring based on finding severity
    const weights = {
      PII: 5.0,
      SSN: 8.0,
      CREDIT_CARD: 7.0,
      CLASSIFIED_MARKING: 9.0,
      API_KEY: 6.0,
    };

    let score = 0;
    for (const finding of findings) {
      score += weights[finding.type] || 3.0;
    }

    return Math.min(score, 10.0);
  }
}

// API layer enforcement
app.post("/api/exports/:id/generate", async (req, res) => {
  const exportRequest = await exportService.get(req.params.id);

  // Scan all files in export
  for (const file of exportRequest.files) {
    const dlpResult = await dlpService.scan(file.content, file.metadata);

    if (!dlpResult.allowed) {
      await auditLog.record({
        event: "dlp_block",
        export_id: exportRequest.id,
        risk_score: dlpResult.risk_score,
        findings: dlpResult.findings,
      });

      return res.status(403).json({
        error: "Export blocked by DLP",
        risk_score: dlpResult.risk_score,
        findings: dlpResult.findings.map((f) => ({
          type: f.type,
          description: f.description,
        })),
      });
    }
  }

  // All files passed DLP - proceed with export
  const exportFile = await exportService.generate(exportRequest);
  res.json({ download_url: exportFile.url });
});

// Production guardrail
if (process.env.NODE_ENV === "production") {
  if (config.dlp.mode !== "blocking") {
    throw new Error("DLP must be in blocking mode in production");
  }
}
```

**Priority**: P0 (Data loss prevention)

---

### 5. No Key Escrow for Encrypted Exports (T-04)

**Gap**: Encrypted exports use ephemeral keys that are lost if user loses credentials.

**Risk**: Data recovery impossible if user loses access; also prevents forensic investigation.

**Recommendation**:

```typescript
// Key escrow for export encryption
class ExportEncryptionService {
  async encrypt(data: Buffer, metadata: ExportMetadata): Promise<EncryptedExport> {
    // Generate ephemeral key
    const dataKey = crypto.randomBytes(32);

    // Encrypt data with ephemeral key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Wrap ephemeral key with user's public key (for user access)
    const userWrappedKey = await this.wrapKey(dataKey, metadata.user_public_key);

    // Wrap ephemeral key with escrow public key (for recovery)
    const escrowWrappedKey = await this.wrapKey(dataKey, await this.getEscrowPublicKey());

    // Store wrapped keys
    await this.keyStore.store({
      export_id: metadata.export_id,
      user_wrapped_key: userWrappedKey.toString("base64"),
      escrow_wrapped_key: escrowWrappedKey.toString("base64"),
      algorithm: "aes-256-gcm",
      key_id: metadata.export_id,
    });

    return {
      ciphertext: encrypted,
      iv: iv.toString("base64"),
      auth_tag: authTag.toString("base64"),
      key_id: metadata.export_id,
    };
  }

  async decrypt(exportId: string, requesterPublicKey: string): Promise<Buffer> {
    const keyInfo = await this.keyStore.get(exportId);

    // Try to unwrap with user's key first
    try {
      const dataKey = await this.unwrapKey(
        Buffer.from(keyInfo.user_wrapped_key, "base64"),
        requesterPublicKey
      );

      return this.decryptWithKey(exportId, dataKey);
    } catch (err) {
      // User key failed - require escrow approval
      throw new Error("Export decryption requires key escrow approval");
    }
  }

  async recoverWithEscrow(exportId: string, approvalId: string): Promise<Buffer> {
    // Verify multi-party approval for escrow access
    const approval = await this.approvalService.verify(approvalId);
    if (!approval.approved || approval.type !== "key_escrow_recovery") {
      throw new Error("Key escrow recovery requires multi-party approval");
    }

    const keyInfo = await this.keyStore.get(exportId);

    // Unwrap with escrow key (stored in HSM)
    const dataKey = await this.hsmService.unwrapKey(
      Buffer.from(keyInfo.escrow_wrapped_key, "base64")
    );

    await this.auditLog.record({
      event: "key_escrow_recovery",
      export_id: exportId,
      approval_id: approvalId,
      severity: "critical",
    });

    return this.decryptWithKey(exportId, dataKey);
  }

  private async wrapKey(key: Buffer, publicKey: string): Promise<Buffer> {
    // Use RSA-OAEP for key wrapping
    return crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      key
    );
  }
}
```

**Priority**: P1 (Business continuity + compliance)

---

## DLP Integration Architecture

### DLP Policy Framework

```yaml
# DLP policies for export scanning
dlp_policies:
  - name: PII Detection
    enabled: true
    mode: blocking
    patterns:
      - type: ssn
        regex: '\b\d{3}-\d{2}-\d{4}\b'
        weight: 8.0
      - type: email
        regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        weight: 3.0
      - type: phone
        regex: '\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        weight: 4.0

  - name: Classified Markings
    enabled: true
    mode: blocking
    patterns:
      - type: classification_banner
        regex: "(TOP SECRET|SECRET|CONFIDENTIAL|UNCLASSIFIED)"
        weight: 9.0
      - type: sci_control
        regex: "(TK|SI|HCS|KDK|KLONDIKE|RUFF)"
        weight: 9.0

  - name: Credentials Detection
    enabled: true
    mode: blocking
    patterns:
      - type: api_key
        regex: '(api[_-]?key|apikey)["\s:=]+[a-zA-Z0-9]{32,}'
        weight: 7.0
      - type: aws_key
        regex: "AKIA[0-9A-Z]{16}"
        weight: 8.0
      - type: jwt
        regex: 'eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+'
        weight: 6.0

  - name: IC Specific Patterns
    enabled: true
    mode: blocking
    patterns:
      - type: dissemination_control
        regex: "(NOFORN|ORCON|PROPIN|RELIDO|REL TO)"
        weight: 8.0
      - type: fvey
        regex: "(FVEY|AUS|CAN|GBR|NZL)"
        weight: 7.0
```

### Multi-Engine DLP Architecture

```typescript
// Composite DLP scanner using multiple engines
class CompositeDLPScanner {
  private engines = [
    new RegexDLPEngine(),
    new MLDLPEngine(), // ML-based entity recognition
    new YaraDLPEngine(), // Binary pattern matching
    new CustomICEngine(), // IC-specific patterns
  ];

  async scan(file: Buffer, metadata: FileMetadata): Promise<DLPResult> {
    // Run all engines in parallel
    const results = await Promise.all(this.engines.map((engine) => engine.scan(file, metadata)));

    // Merge and deduplicate findings
    const allFindings = this.mergeFindings(results);

    // Calculate aggregate risk score
    const riskScore = this.aggregateRiskScore(results);

    return {
      allowed: riskScore < MAX_RISK_SCORE,
      risk_score: riskScore,
      findings: allFindings,
      engine_results: results,
    };
  }

  private mergeFindings(results: DLPResult[]): DLPFinding[] {
    const findingsMap = new Map<string, DLPFinding>();

    for (const result of results) {
      for (const finding of result.findings) {
        const key = `${finding.type}:${finding.location}`;
        if (!findingsMap.has(key)) {
          findingsMap.set(key, finding);
        } else {
          // Take higher severity if duplicate
          const existing = findingsMap.get(key)!;
          if (finding.weight > existing.weight) {
            findingsMap.set(key, finding);
          }
        }
      }
    }

    return Array.from(findingsMap.values());
  }
}
```

---

## Remediation Roadmap

### Phase 1: Critical (0-30 days)

1. **Implement mandatory manifest signing** (T-03)
   - Add signature generation to manifest service
   - Enforce signature verification on export processing
   - Add production guardrail for unsigned manifests
   - Test: Attempt to process unsigned manifest (should fail)

2. **Implement bulk export approval workflow** (E-01)
   - Define bulk export thresholds
   - Create multi-party approval workflow
   - Enforce approval check at API layer
   - Test: Attempt bulk export without approval (should block)

3. **Make DLP blocking, not advisory** (I-04)
   - Configure DLP in blocking mode
   - Implement fail-closed DLP enforcement
   - Add multi-engine DLP scanning
   - Test: Export file with SSN (should be blocked)

4. **Implement universal watermarking** (T-02)
   - Add watermarking strategies for all export formats
   - Enforce watermarking in production
   - Validate watermark integrity
   - Test: Export CSV/JSON (should contain watermark)

### Phase 2: High Priority (30-60 days)

5. **Implement key escrow for encrypted exports** (T-04)
   - Add escrow key wrapping
   - Create key recovery workflow
   - Store wrapped keys in HSM
   - Test: Recover export with escrow approval

6. **Add classification validation** (T-01, E-02)
   - Validate user clearance vs export classification
   - Implement label integrity checks
   - Audit classification violations
   - Test: SECRET user attempts TOP SECRET export (should fail)

7. **Implement export storage security** (I-02)
   - Remove public bucket access
   - Use pre-signed URLs with short TTL
   - Enable S3 encryption (SSE-KMS)
   - Test: Attempt direct S3 access (should fail)

8. **Add immutable audit logging** (R-01)
   - Implement write-once audit storage
   - Replicate logs to SIEM
   - Audit log deletion attempts
   - Test: Attempt to delete audit log (should fail)

### Phase 3: Medium Priority (60-90 days)

9. **Implement export quotas** (D-01)
   - Add per-user storage limits
   - Auto-expire old exports (7 days)
   - Monitor storage usage
   - Test: Exceed quota (should be rate-limited)

10. **Add download token security** (S-02)
    - Implement signed download tokens (HMAC)
    - Add token replay detection
    - Use short TTL (15 minutes)
    - Test: Reuse download token (should fail)

11. **Implement MFA for sensitive exports** (S-01)
    - Require MFA for high-classification exports
    - Validate session binding
    - Audit MFA bypass attempts
    - Test: Export SECRET data without MFA (should prompt)

12. **Add malware scanning** (T-05)
    - Integrate ClamAV or VirusTotal
    - Scan all uploaded files
    - Block exports containing malware
    - Test: Export file with EICAR test string (should block)

---

## Testing & Validation

### Security Test Cases

```typescript
describe("Export Security", () => {
  // Critical Gap: Manifest signing
  it("should reject unsigned export manifests", async () => {
    const manifest = {
      export_id: "test-123",
      files: [{ name: "data.csv", size: 1024 }],
      // Missing signature
    };

    await expect(manifestService.verify(manifest)).rejects.toThrow("Manifest signature required");
  });

  // Critical Gap: Bulk export approval
  it("should require approval for bulk exports", async () => {
    const bulkExport = {
      entity_count: 5000, // Exceeds threshold
      user_id: "analyst-1",
    };

    const response = await request(app).post("/api/exports").send(bulkExport).expect(202);

    expect(response.body.status).toBe("pending_approval");
    expect(response.body.workflow_id).toBeDefined();
  });

  // Critical Gap: DLP blocking
  it("should block export containing SSN", async () => {
    const fileWithSSN = Buffer.from("User SSN: 123-45-6789", "utf-8");

    const dlpResult = await dlpService.scan(fileWithSSN, {
      classification: "UNCLASSIFIED",
    });

    expect(dlpResult.allowed).toBe(false);
    expect(dlpResult.findings).toContainEqual(expect.objectContaining({ type: "ssn" }));
  });

  // Critical Gap: Watermarking enforcement
  it("should watermark all export formats", async () => {
    const formats = ["pdf", "csv", "json", "image"];

    for (const format of formats) {
      const file = createTestFile(format);
      const watermarked = await watermarkService.watermark(file, format, {
        user_id: "analyst-1",
        export_id: "test-123",
      });

      const hasWatermark = await watermarkService.detect(watermarked, format);
      expect(hasWatermark).toBe(true);
    }
  });

  // Key escrow recovery
  it("should support key escrow recovery with approval", async () => {
    const exportData = Buffer.from("sensitive data");

    const encrypted = await encryptionService.encrypt(exportData, {
      export_id: "test-123",
      user_public_key: userPublicKey,
    });

    // Simulate user losing access - require escrow
    const approvalId = await approvalService.create({
      type: "key_escrow_recovery",
      export_id: "test-123",
    });

    await approvalService.approve(approvalId, "approver-1");
    await approvalService.approve(approvalId, "approver-2");

    const recovered = await encryptionService.recoverWithEscrow("test-123", approvalId);

    expect(recovered.toString()).toBe("sensitive data");
  });
});
```

---

## Monitoring & Detection

### Key Metrics

```yaml
# Prometheus alerts for export threats

# Unsigned manifest detection
- alert: UnsignedExportManifest
  expr: |
    export_manifest_signature_failures_total > 0
  severity: critical

# Bulk export without approval
- alert: BulkExportWithoutApproval
  expr: |
    export_bulk_approval_bypass_total > 0
  severity: critical

# DLP block events
- alert: DLPBlockedExport
  expr: |
    rate(dlp_block_total[5m]) > 5
  severity: high
  annotations:
    summary: High rate of DLP-blocked exports

# Export storage quota exceeded
- alert: ExportStorageQuotaExceeded
  expr: |
    export_storage_used_bytes / export_storage_quota_bytes > 0.9
  severity: warning

# Anomalous export volume
- alert: AnomalousExportVolume
  expr: |
    rate(export_created_total[1h]) > 100
  severity: warning
  annotations:
    summary: Unusual export activity - possible data exfiltration

# Clearance violation attempts
- alert: ClearanceViolation
  expr: |
    export_clearance_violations_total > 0
  severity: critical
```

---

## References

- **NIST SP 800-53**: Security Controls for Export Functions (AC-4, AC-6)
- **CNSSI 1253**: Classified Data Protection Requirements
- **ICAM**: Export Watermarking Best Practices
- **AWS S3 Security**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html
- **OWASP DLP**: https://cheatsheetseries.owasp.org/cheatsheets/Data_Loss_Prevention_Cheat_Sheet.html

---

## Document Control

**Change Log**:

| Version | Date       | Author        | Changes                       |
| ------- | ---------- | ------------- | ----------------------------- |
| 1.0     | 2025-12-27 | Security Team | Initial threat model creation |

**Approval**:

- [ ] Security Architect
- [ ] Engineering Lead
- [ ] Compliance Officer

**Next Review**: 2026-03-27
