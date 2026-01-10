# Residency Allow/Deny Cases (Sample)

| Case | Tenant | Requested Region | Allowed Regions | Decision | Reason Code                  |
| ---- | ------ | ---------------- | --------------- | -------- | ---------------------------- |
| 1    | acme   | us-east-1        | us-east-1       | allow    | residency.allowed            |
| 2    | acme   | eu-west-1        | us-east-1       | deny     | residency.region_not_allowed |
| 3    | beta   | eu-central-1     | eu-central-1    | allow    | residency.allowed            |
| 4    | beta   | us-west-2        | eu-central-1    | deny     | residency.region_not_allowed |
