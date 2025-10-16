def map_duckdb_to_intelgraph(sql_file_path):
    """
    Simulates mapping data extracted via DuckDB SQL to IntelGraph entities.
    This is a simplified mapping for demonstration purposes.
    In a real scenario, this would execute the SQL against a DuckDB instance.
    """
    entities = []
    # For this example, we'll simulate some data that would be returned by the SQL query
    # based on the sample.sql content.
    simulated_data = [
        {"id": 101, "name": "John Doe", "type": "User", "description": "A user from DuckDB"},
        {
            "id": 102,
            "name": "Jane Smith",
            "type": "User",
            "description": "Another user from DuckDB",
        },
    ]

    for row in simulated_data:
        if row["type"] == "User":
            entities.append(
                {
                    "type": "Person",
                    "properties": {
                        "id": str(row["id"]),
                        "name": row["name"],
                        "description": row["description"],
                    },
                }
            )
    return entities


if __name__ == "__main__":
    # Example usage
    sample_entities = map_duckdb_to_intelgraph("sample.sql")
    for entity in sample_entities:
        print(entity)
