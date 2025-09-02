# Runbook: Blackbox Probe Failing

**Alert Name:** `BlackboxProbeFailing`, `BlackboxProbeTTFBHigh`

**Summary:** This alert indicates that a synthetic blackbox probe is failing (e.g., returning non-2xx HTTP status, connection refused) or experiencing high Time To First Byte (TTFB), suggesting an issue with the availability or performance of a critical endpoint.

**Severity:**
*   `BlackboxProbeFailing`: Critical
*   `BlackboxProbeTTFBHigh`: Warning

**Impact:** Potential service outage, degraded user experience, or slow response times for critical functionalities.

## Troubleshooting Steps

1.  **Verify Alert:**
    *   Confirm the alert is active in Alertmanager.
    *   Identify the target (`{{ $labels.__param_target }}`) and the specific probe module (`{{ $labels.module }}`) from the alert details.

2.  **Check Target Endpoint Directly:**
    *   Attempt to access the target URL (`{{ $labels.__param_target }}`) directly from a machine within the cluster (e.g., using `curl` or `wget`) to confirm its accessibility and response.
    *   Example: `curl -v {{ $labels.__param_target }}`

3.  **Inspect Blackbox Exporter Logs:**
    *   Check the logs of the Blackbox Exporter pod for any errors or warnings related to the failing probe.
    *   Look for messages indicating connection issues, SSL/TLS problems, or unexpected HTTP responses.

4.  **Check Blackbox Exporter Configuration:**
    *   Verify that the `blackbox-targets.yaml` configuration for the probe module is correct and matches the expected behavior of the target endpoint.

5.  **Network Connectivity:**
    *   Ensure there are no network connectivity issues between the Blackbox Exporter pod and the target endpoint (e.g., firewall rules, network policies, service mesh issues).

6.  **Target Service Health:**
    *   If the target is a service (e.g., UI, Gateway), check the health and logs of that service's pods.
    *   Look for application errors, resource saturation (CPU, memory), or recent deployments.

7.  **Prometheus Scrape Configuration:**
    *   Verify that Prometheus is correctly scraping metrics from the Blackbox Exporter. Check Prometheus targets status page.

## Resolution

*   **Restore Target Service:** If the target service is down or unhealthy, follow its specific runbook to restore its operation.
*   **Correct Configuration:** If a misconfiguration in Blackbox Exporter or Prometheus is found, correct it and apply the changes.
*   **Network Troubleshooting:** Address any identified network issues.
*   **Scale Resources:** If the issue is due to resource constraints on the target service, consider scaling up.
*   **Adjust Probe Thresholds:** For `BlackboxProbeTTFBHigh`, if the high TTFB is expected under certain load conditions, consider adjusting the alert threshold after careful analysis.

## Post-Mortem / Follow-up

*   Document the incident, its root cause, and the steps taken for resolution.
*   Implement preventative measures to avoid recurrence.
*   Review and adjust probe configurations or alert thresholds if necessary.
