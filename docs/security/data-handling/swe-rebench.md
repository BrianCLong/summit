# Data Handling for SWE-rebench

## Data types

| Data               | Classification |
| ------------------ | -------------- |
| public repos       | public         |
| evaluation results | internal       |
| agent logs         | sensitive      |

## Never log

* repo tokens
* docker credentials
* private repo URLs

## Retention

* CI artifacts: 14 days
* benchmark reports: 90 days
