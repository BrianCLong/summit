# Burn Rate & Cost Model

**Target:** < $18k/mo Infra, < $5k/mo LLM.
**Alert Threshold:** 80% of budget.

## Infrastructure (Estimated)

| Component         | Size/Type         | Count  | Unit Cost | Total/Mo    |
| :---------------- | :---------------- | :----- | :-------- | :---------- |
| **K8s Cluster**   | m5.2xlarge        | 6      | $280      | $1,680      |
| **Neo4j Ent.**    | Cluster (3 nodes) | 1      | $3,000    | $3,000      |
| **Postgres RDS**  | db.r5.xlarge      | 2 (HA) | $500      | $1,000      |
| **Elasticsearch** | Managed           | 3      | $400      | $1,200      |
| **Redis**         | Managed           | 1      | $200      | $200        |
| **Networking**    | NAT/ALB           | -      | -         | $500        |
| **S3/Storage**    | Standard          | -      | -         | $500        |
| **Misc**          | Monitoring/Sec    | -      | -         | $1,000      |
| **Total Infra**   |                   |        |           | **~$9,080** |

**Status:** ✅ Within Budget ($9,080 < $18,000)

## LLM Consumption (Estimated)

- **Daily Active Users:** 500
- **Avg Prompts/User:** 20
- **Avg Tokens/Prompt (In+Out):** 1,500
- **Total Tokens/Day:** 15M
- **Model Mix:** 80% GPT-3.5-Turbo ($0.0015/1k), 20% GPT-4 ($0.04/1k)
- **Blended Cost/1k:** ~$0.009

- **Daily Cost:** 15,000 \* $0.009 = $135
- **Monthly Cost:** $135 \* 30 = $4,050

**Status:** ✅ Within Budget ($4,050 < $5,000)

## Alerting Configuration

Configured in `observability/alert-rules.yml`:

- **Infra Warn:** $14,000 projected
- **Infra Critical:** $16,000 projected
- **LLM Warn:** $4,000 projected
- **LLM Critical:** $4,500 projected

## Evidence

- [AWS Cost Explorer Screenshot](./evidence/aws_cost.png)
- [OpenAI Usage Dashboard](./evidence/openai_cost.png)
