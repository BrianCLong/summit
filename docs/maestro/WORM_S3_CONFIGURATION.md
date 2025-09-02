# Maestro Evidence Immutability (WORM) S3 Configuration

## Overview

This document outlines the configuration required for an Amazon S3 bucket to store Maestro's evidence in a Write Once, Read Many (WORM) compliant manner. This ensures the integrity and immutability of critical audit and compliance artifacts.

## Requirements

- **S3 Object Lock:** Enabled in Compliance mode.
- **Versioning:** Enabled on the bucket.
- **Server-Side Encryption:** SSE-KMS with a Customer Master Key (CMK).
- **Default Retention:** 90 days.
- **Lifecycle Policy:** To manage object transitions and expirations after retention.
- **Access Control:** Restrict uploads to only authorized CI/CD roles.
- **Deny Overwrite/Delete:** Explicitly deny `s3:DeleteObject` and `s3:PutObject` (for existing objects) during the retention period.

## AWS S3 Bucket Configuration Steps (Conceptual)

1.  **Create S3 Bucket:**
    - Choose a region (e.g., `us-west-2` as recommended).
    - Enable **Object Lock** during bucket creation (Compliance mode). This cannot be changed after creation.
    - Enable **Versioning**.

2.  **Configure KMS Customer Master Key (CMK):**
    - Create a new KMS CMK (e.g., `alias/maestro-evidence-kms`).
    - Define a Key Policy that grants decrypt permissions to read-only evidence roles.

3.  **Set Default Object Lock Retention:**
    - Navigate to the bucket properties.
    - Under "Object Lock", set a default retention period (e.g., 90 days) in Compliance mode.

4.  **Configure Bucket Policy (Conceptual Example):**
    - Apply a bucket policy to enforce SSE-KMS and deny unauthorized modifications.

    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "DenyUnencryptedUploads",
          "Effect": "Deny",
          "Action": "s3:PutObject",
          "Resource": "arn:aws:s3:::your-maestro-evidence-bucket/*",
          "Condition": {
            "StringNotEquals": {
              "s3:x-amz-server-side-encryption": "aws:kms"
            },
            "Null": {
              "s3:x-amz-server-side-encryption": "true"
            }
          }
        },
        {
          "Sid": "DenyNonKMSKey",
          "Effect": "Deny",
          "Action": "s3:PutObject",
          "Resource": "arn:aws:s3:::your-maestro-evidence-bucket/*",
          "Condition": {
            "StringNotLike": {
              "s3:x-amz-server-side-encryption-aws-kms-key-id": "arn:aws:kms:us-west-2:YOUR_ACCOUNT_ID:key/YOUR_KMS_KEY_ID"
            }
          }
        },
        {
          "Sid": "DenyObjectDeletionDuringRetention",
          "Effect": "Deny",
          "Action": ["s3:DeleteObject", "s3:DeleteObjectVersion"],
          "Resource": "arn:aws:s3:::your-maestro-evidence-bucket/*",
          "Condition": {
            "StringEquals": {
              "s3:object-lock-mode": "COMPLIANCE"
            }
          }
        },
        {
          "Sid": "AllowCiUploadsOnly",
          "Effect": "Deny",
          "NotPrincipal": {
            "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:role/YourCiUploadRole"
          },
          "Action": "s3:PutObject",
          "Resource": "arn:aws:s3:::your-maestro-evidence-bucket/*"
        }
      ]
    }
    ```

    - **Replace placeholders:** `your-maestro-evidence-bucket`, `YOUR_ACCOUNT_ID`, `YOUR_KMS_KEY_ID`, `YourCiUploadRole`.
    - **Note:** The `DenyObjectDeletionDuringRetention` condition relies on Object Lock being enabled in Compliance mode.

5.  **Configure Lifecycle Rules:**
    - Set up rules to transition objects to cheaper storage classes (e.g., Glacier) or expire them after the retention period.

## Verification

- Attempt to delete/overwrite an object within its retention period (should be blocked).
- Verify that only authorized CI/CD roles can upload objects.
- Confirm objects are encrypted with the specified KMS key.
