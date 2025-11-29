# SummitThreat API Reference

This document provides a reference for the SummitThreat API.

## Base URL

`http://<host>:<port>/api/v1`

## Endpoints

### GET /api/v1/iocs

*   **Description:** Retrieves a list of Indicators of Compromise (IOCs).
*   **Response:**
    ```json
    {
      "iocs": [
        {
          "name": "LockBit Black Ransomware IOCs",
          "author": "ThreatSource",
          "created": "2025-11-20T10:00:00.000Z",
          "indicator_count": 152,
          "threat_score": 70,
          "prediction": "Medium probability of being malicious. Further investigation is advised."
        }
      ]
    }
    ```

### GET /api/v1/attack-surface

*   **Description:** Retrieves a list of discovered assets and their vulnerabilities.
*   **Response:**
    ```json
    {
      "assets": [
        {
          "id": "asset-001",
          "type": "Cloud Storage",
          "name": "summitthreat-customer-data-bucket",
          "platform": "AWS S3",
          "region": "us-east-1",
          "status": "Active",
          "vulnerabilities": [
            {
              "id": "vuln-001",
              "severity": "High",
              "description": "Publicly accessible S3 bucket.",
              "recommendation": "Restrict public access to the bucket."
            }
          ]
        }
      ]
    }
    ```

### GET /api/v1/deep-web

*   **Description:** Retrieves a list of findings from the deep and dark web.
*   **Response:**
    ```json
    {
      "findings": [
        {
          "id": "dw-001",
          "type": "Forum Post",
          "source": "DarkForum",
          "language": "Russian",
          "translated_content": "We are selling a database of 1.5 million user credentials from a major e-commerce platform. The price is 2 BTC.",
          "author": "shadow_hacker",
          "timestamp": "2025-11-20T10:00:00.000Z",
          "actors": ["shadow_hacker"],
          "indicators": ["1.5 million user credentials", "2 BTC"]
        }
      ]
    }
    ```
