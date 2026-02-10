from summit_rt.blackbox.prompt_assembly import assemble

def test_contract_inclusion():
    contract = "CONTRACT: Do not guess."
    subgraph = "NODES: ..."
    query = "How do I fly?"

    parts = assemble(contract_md=contract, serialized_subgraph=subgraph, user_query=query)

    assert "CONTRACT: Do not guess." in parts.system
    assert "CONTEXT:\nNODES: ..." in parts.system
    assert "USER QUERY:\nHow do I fly?" in parts.user

def test_missing_context_instruction_in_contract():
    # Load the actual contract
    with open("summit_rt/blackbox/prompt_contract.md") as f:
        contract = f.read()

    assert "If required information is missing, say what is missing" in contract
