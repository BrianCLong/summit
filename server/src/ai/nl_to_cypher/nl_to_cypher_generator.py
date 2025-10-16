# server/src/ai/nl_to_cypher/nl_to_cypher_generator.py


def generate_cypher_query(natural_language_query: str) -> str:
    """
    Stub for generating a Cypher query from a natural language query.
    In a real implementation, this would involve an LLM or a more sophisticated rule-based system.
    """
    print(f"Generating Cypher for: {natural_language_query}")
    query_lower = natural_language_query.lower()

    if "find all persons" in query_lower:
        return "MATCH (p:Person) RETURN p"
    elif "persons named" in query_lower:
        # Extract name from original query to preserve casing
        name_start_index = query_lower.find("persons named ") + len("persons named ")
        name = natural_language_query[name_start_index:].strip()
        return f"MATCH (p:Person {{name: '{name}'}}) RETURN p"
    elif "events by" in query_lower:
        # Extract source from original query to preserve casing
        source_start_index = query_lower.find("events by ") + len("events by ")
        source = natural_language_query[source_start_index:].strip()
        return f"MATCH (e:Event)-[:HAS_SOURCE]->(s {{name: '{source}'}}) RETURN e"
    elif "assets in location" in query_lower:
        # Extract location from original query to preserve casing
        location_start_index = query_lower.find("assets in location ") + len("assets in location ")
        location = natural_language_query[location_start_index:].strip()
        return f"MATCH (a:Asset)-[:LOCATED_AT]->(l:Location {{name: '{location}'}}) RETURN a"
    else:
        return "// Cypher query not generated for this input"


def estimate_query_cost(cypher_query: str) -> dict:
    """
    Stub for estimating the cost/rows of a Cypher query.
    """
    print(f"Estimating cost for: {cypher_query}")
    return {"estimated_rows": 100, "estimated_cost_units": 5}
