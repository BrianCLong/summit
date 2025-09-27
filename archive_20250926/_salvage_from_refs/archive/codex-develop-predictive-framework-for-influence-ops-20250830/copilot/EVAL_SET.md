# Copilot Evaluation Set

## NL→Query
| NL Prompt                              | Expected Query |
|----------------------------------------|----------------|
| Show all alerts from Slack last 24h    | `MATCH (a:Alert {source:'slack'}) WHERE a.timestamp > datetime() - duration({hours:24}) RETURN a` |
| List Jira tickets linked to incident 42| `MATCH (i:Incident {id:42})-[:HAS_TICKET]->(t:JiraTicket) RETURN t` |

## RAG Citation
| Question                                         | Expected Source                 | Notes                              |
|--------------------------------------------------|---------------------------------|------------------------------------|
| What is the retention policy for audit logs?     | `docs/OPS/SLOS.md`              | Should cite SLO policy             |
| How are connectors rate-limited?                 | `docs/CONNECTORS.md`            | Source must be included            |
