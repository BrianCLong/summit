from summit_sdk import SummitClient, flow, tool, rag, PolicyContext

client = SummitClient(api_key="demo", endpoint="local")
policy = PolicyContext(tenant="demo-tenant", region="us-west")


@tool()
def get_build_number(service: str) -> str:
    return f"build-{service}-1234"


kb = rag.KnowledgeBase(client, profile="frontier_core")


@flow()
def hello(question: str):
    ctx = kb.retrieve(question, policy=policy)
    result = client.model("frontier-1.3b-aligned", policy=policy).chat(
        messages=[{"role": "user", "content": question}],
        context=ctx,
        tools=[get_build_number],
    )
    return {"answer": result["text"], "trace_id": client.emitter.trace_id}


if __name__ == "__main__":
    print(hello("What is the latest build?"))

