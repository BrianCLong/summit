from summit_sdk import SummitClient, flow, tool, PolicyContext

client = SummitClient(api_key="demo", endpoint="local")
policy = PolicyContext(tenant="sre", region="us-east", purpose="operations")


@tool(audit_tags={"runbook": "restart_service"})
def fetch_metrics(service: str) -> dict:
    return {"service": service, "cpu": 0.42, "errors": 0}


@tool(audit_tags={"runbook": "restart_service"})
def restart_service(service: str) -> str:
    return f"restart issued for {service}"


@tool(audit_tags={"category": "safety"})
def safety_check(metrics: dict) -> bool:
    return metrics.get("errors", 0) > 0 or metrics.get("cpu", 0) > 0.8


@flow(policy_defaults=policy.to_dict())
def ops_agent(request: str):
    metrics = fetch_metrics(service=request)
    if safety_check(metrics):
        action = restart_service(service=request)
    else:
        action = "noop: safe threshold not met"
    return {
        "action": action,
        "metrics": metrics,
        "trace_id": client.emitter.trace_id,
    }


if __name__ == "__main__":
    print(ops_agent("search"))

