---
name: Autonomy Signal
about: Report an anomaly or drift detected by the Autonomy system
title: '[SIGNAL] '
labels: ['autonomy', 'signal']
assignees: []
---

### Signal Description

**Type**: {{ trigger_type }}
**Source**: {{ source }}
**Detected At**: {{ timestamp }}

### Details

{{ description }}

### Evidence

- [Anomaly Report]({{ anomaly_report_link }})
- [Metric Graph]({{ metric_graph_link }})
- [Policy Check]({{ policy_check_link }})

### Proposed Remediation

{{ remediation_proposal }}

### Metadata

- **Rule ID**: {{ rule_id }}
- **Fingerprint**: {{ fingerprint }}
