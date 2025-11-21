# $0 Control Plane Reference Stacks

These fully open-source stacks extend the Summit deployments without adding any
software licensing costs. Mix and match components as needed—the goal is to
use the automation you already have while keeping the control plane free to
run on your own compute.

## Option A — Minimal, fast to stand up

| Layer | Recommended Projects | Why it matters |
| ----- | -------------------- | -------------- |
| Provisioning & Config | [OpenTofu](https://opentofu.org/) + [Ansible](https://www.ansible.com/) | Terraform-compatible IaC plus agentless configuration management so you can bootstrap hosts right after provisioning. |
| Kubernetes Scaling | Cluster Autoscaler & optional [KEDA](https://keda.sh/) | Rightsize your k3s/Kubernetes footprint automatically and scale event-driven jobs to zero. |
| Observability | Prometheus + Alertmanager, Grafana OSS, Loki, Prometheus `blackbox_exporter` | Covers metrics, dashboards, logging, and uptime probes with proven CNCF projects. |

**When to choose it:** You want to get to production quickly with the
lightest-weight toolchain and add GitOps later.

## Option B — Full GitOps control plane

| Layer | Recommended Projects | Why it matters |
| ----- | -------------------- | -------------- |
| Provisioning | [Crossplane](https://www.crossplane.io/) | Manage cloud databases, queues, and networks through Kubernetes CRDs and Git. |
| GitOps CD | [Argo CD](https://argo-cd.readthedocs.io/) _or_ [Flux CD](https://fluxcd.io/) | Continuous delivery that syncs clusters from Git with drift detection and rollbacks. |
| Observability | Prometheus + Grafana OSS + Alertmanager, [Grafana Mimir](https://grafana.com/oss/mimir/) for long-term metrics, [Loki](https://grafana.com/oss/loki/) for logs, [Tempo](https://grafana.com/oss/tempo/) for traces, routed via the [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/). | Complete metrics/logs/traces coverage with long-term retention using object storage. |
| Autoscaling | KEDA + Cluster Autoscaler | Autoscale both pods and nodes from workload and queue-driven signals. |

**When to choose it:** You need everything managed from Git with team
workflows, guardrails, and long-term telemetry retention.

## Choosing and Operating the Stack

1. **Start small.** Begin with Option A to get baseline observability and IaC,
   then layer in Crossplane/Argo/Flux as your team adopts GitOps.
2. **Reuse Helm charts and exporters.** The same Prometheus/Grafana/Loki
   configuration ships in `deploy/aws` and the Free Stack bootstrap script—use
   one chart set everywhere to simplify operations.
3. **Keep it $0.** All components are OSS; the only costs are compute, storage,
   and any optional object storage for Mimir/Tempo.
4. **Mix components as needed.** It is perfectly valid to run Crossplane with
   the "minimal" observability stack, or to keep Ansible alongside GitOps.

For deployment-ready manifests and Helm values, see the `deploy/aws` and
`deploy/free-stack` directories.
