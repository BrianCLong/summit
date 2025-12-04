from summit_sdk import SummitClient, flow, tool, rag, PolicyContext

client = SummitClient(api_key="demo", endpoint="local")
policy = PolicyContext(tenant="enterprise", region="us-west", sensitivity="internal")
kb = rag.KnowledgeBase(client, profile="docs+graph")


@tool(audit_tags={"category": "provenance"})
def show_provenance(passages):
    return [p.get("content") for p in passages]


@flow(policy_defaults=policy.to_dict())
def doc_graph_copilot(question: str):
    context = kb.retrieve(question, policy=policy)
    response = client.model("frontier-1.3b-aligned", policy=policy).chat(
        messages=[{"role": "user", "content": question}],
        context=context,
        tools=[show_provenance],
    )
    return {
        "answer": response["text"],
        "evidence": show_provenance(context.passages),
        "trace_id": client.emitter.trace_id,
    }


if __name__ == "__main__":
    print(doc_graph_copilot("Where is the DR plan?"))

