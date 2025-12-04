from summit_sdk import SummitClient, flow, tool, rag, PolicyContext

client = SummitClient(api_key="demo", endpoint="local")
policy = PolicyContext(tenant="engineering", region="global", purpose="dev_assistant")
kb = rag.KnowledgeBase(client, profile="code+logs")


@tool(audit_tags={"category": "patch"})
def propose_patch(diff: str) -> str:
    return f"patch://{hash(diff)}"


@tool(audit_tags={"category": "alignment"})
def alignment_check(text: str) -> bool:
    blocked_terms = ["secret", "password"]
    return not any(term in text.lower() for term in blocked_terms)


@flow(policy_defaults=policy.to_dict())
def dev_console(question: str):
    context = kb.retrieve(question, policy=policy)
    response = client.model("frontier-1.3b-aligned", policy=policy).chat(
        messages=[{"role": "user", "content": question}],
        context=context,
    )
    if alignment_check(response["text"]):
        patch = propose_patch(f"// suggestion for: {question}")
    else:
        patch = "blocked by alignment"
    return {
        "answer": response["text"],
        "patch": patch,
        "trace_id": client.emitter.trace_id,
    }


if __name__ == "__main__":
    print(dev_console("Summarize failing tests"))

