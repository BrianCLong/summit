# Financial Exposure Model

This document outlines the model for calculating potential financial exposure from legal claims.

## 1. Exposure Formula

$$ \text{Total Exposure} = \sum (\text{Claim Probability} \times \text{Estimated Cost}) - \text{Insurance Coverage} $$

## 2. Cost Components

### A. Defense Costs (Legal Fees)

- **Motion to Dismiss:** $50k - $150k
- **Discovery Phase:** $200k - $1M+ (highly dependent on data volume)
- **Class Certification Fight:** $500k+
- **Trial:** $1M+

### B. Settlement / Damages

- **Data Breach (Per Record):**
  - Regulated (PHI/fin): $150 - $400 / record
  - Standard PII: $50 - $150 / record
- **Statutory Damages:**
  - BIPA (IL): $1,000 (negligent) to $5,000 (reckless) per violation (per scan). **Catastrophic Risk.**
  - TCPA: $500 - $1,500 per call/text.
  - CCPA: $100 - $750 per consumer per incident (if non-encrypted/redacted).

### C. Regulatory Fines

- **GDPR:** Up to 4% of global turnover or €20M.
- **FTC:** Settlement orders often include 20-year auditing requirements (high operational cost).

## 3. Insurance Offsets

- **Cyber Liability Policy:** Limit $**\_\_\_** (Check exclusions for "unencrypted data" or "biometrics").
- **E&O (Errors and Omissions):** Limit $**\_\_\_** (Covers contract breach/negligence).
- **D&O (Directors and Officers):** Limit $**\_\_\_** (Covers shareholder suits).

## 4. Scenario Analysis (Example)

| Scenario                       | Records          | Est. Cost/Record                      | Defense Cost | Total Gross | Insured?            | Net Exposure    |
| :----------------------------- | :--------------- | :------------------------------------ | :----------- | :---------- | :------------------ | :-------------- |
| **Email Leak (10k users)**     | 10,000           | $50                                   | $200k        | $700k       | Yes                 | Deductible Only |
| **Biometric Database Exposed** | 1,000 (IL users) | $3,000 (settlement avg)               | $1M          | $4M         | Maybe (Exclusions?) | **$4M +**       |
| **Ransomware Outage (3 days)** | N/A              | $50k (lost rev) + $100k (SLA credits) | $50k         | $200k       | Yes                 | Low             |

## 5. Action Items

1.  **Review Insurance Policies:** specifically for BIPA and Ransomware exclusions.
2.  **Calculate "Records at Risk":** Run a query to count unique identities in the database to plug into the model.
3.  **Segregate High-Risk Data:** Isolate Biometric data to a separate, higher-security enclave to lower the probability of breach.
