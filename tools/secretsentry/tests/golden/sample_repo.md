# SecretSentry Report

*Scanned files*: 2
*Findings*: 11

| Severity | Rule | File | Line | Redacted Match |
| --- | --- | --- | --- | --- |
| high | AWS Access Key | app/secrets.txt | 1 | AKIA…3456 |
| high | AWS Secret Key | app/secrets.txt | 2 | wJal…EKEY |
| high | Slack Token | app/secrets.txt | 3 | xoxb…WXYZ |
| medium | High Entropy String | app/secrets.txt | 4 | eyJh…VCJ9 |
| medium | High Entropy String | app/secrets.txt | 4 | eyJz…IyfQ |
| medium | High Entropy String | app/secrets.txt | 4 | SflK…sw5c |
| medium | JWT | app/secrets.txt | 4 | eyJh…sw5c |
| high | GitHub Token | app/secrets.txt | 5 | ghp_…Q7R8 |
| high | Stripe Secret Key | app/secrets.txt | 6 | sk_t…9012 |
| high | OAuth Client Secret | app/secrets.txt | 7 | ya29…tial |
| medium | High Entropy String | app/secrets.txt | 8 | abcd…3456 |
