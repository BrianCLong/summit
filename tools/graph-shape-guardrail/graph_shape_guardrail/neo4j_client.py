class Neo4jClient:
    def __init__(self, driver):
        self.driver = driver

    def stream_degrees_map(self, graph_name, node_labels, relationship_types, stable_key='entity_id', orientation='NATURAL'):
        """
        Yields (stable_key, degree) tuples from Neo4j GDS.
        """
        query = """
        CALL gds.degree.stream($graph_name, {
            nodeLabels: $node_labels,
            relationshipTypes: $relationship_types,
            orientation: $orientation
        }) YIELD nodeId, score
        WITH gds.util.asNode(nodeId) AS n, score
        WHERE n[$stable_key] IS NOT NULL
        RETURN n[$stable_key] AS key, score
        """

        session = self.driver.session()
        try:
            result = session.run(query, {
                'graph_name': graph_name,
                'node_labels': node_labels,
                'relationship_types': relationship_types,
                'orientation': orientation,
                'stable_key': stable_key
            })
            for record in result:
                yield record['key'], record['score']
        finally:
            session.close()

    def get_degrees_map(self, graph_name, node_labels, relationship_types, stable_key='entity_id', orientation='NATURAL'):
        """
        Legacy method for backward compatibility.
        """
        return dict(self.stream_degrees_map(graph_name, node_labels, relationship_types, stable_key, orientation))
