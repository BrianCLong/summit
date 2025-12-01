"""
Basic Investigation Example - Python

This example demonstrates how to:
1. Create a new investigation graph
2. Add entities (people, organizations)
3. Create relationships between entities
4. Run AI-powered community detection
5. Query the graph
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from intelgraph import IntelGraphClient, IntelGraphError

# Load environment variables
load_dotenv()


def main():
    """Main example execution."""

    # Initialize the client
    api_key = os.getenv('INTELGRAPH_API_KEY')
    base_url = os.getenv('INTELGRAPH_BASE_URL', 'https://api.intelgraph.ai')

    if not api_key:
        print('❌ Error: INTELGRAPH_API_KEY environment variable is required')
        sys.exit(1)

    client = IntelGraphClient(api_key=api_key, base_url=base_url)

    print('🚀 Creating new investigation...')

    # Step 1: Create a graph for the investigation
    graph = client.graphs.create(
        name='Financial Fraud Investigation - Q4 2024',
        description='Investigation into suspicious financial transactions',
        tags=['fraud', 'financial', 'q4-2024'],
        configuration={
            'layout': 'force-directed',
            'theme': 'dark',
            'autoSave': True
        }
    )

    print(f'✅ Created graph: {graph.id}')
    print(f'   Name: {graph.name}')

    # Step 2: Add entities (suspects, organizations, accounts)
    print('\n👤 Adding entities...')

    suspect1 = client.entities.create(
        graph_id=graph.id,
        type='Person',
        properties={
            'name': 'John Doe',
            'email': 'john.doe@example.com',
            'dateOfBirth': '1980-05-15',
            'nationality': 'US',
            'role': 'Suspect'
        },
        metadata={
            'source': 'OSINT',
            'confidence': 0.85,
            'lastVerified': datetime.now().isoformat()
        }
    )

    print(f"   ✓ Added: {suspect1.properties['name']} ({suspect1.id})")

    suspect2 = client.entities.create(
        graph_id=graph.id,
        type='Person',
        properties={
            'name': 'Jane Smith',
            'email': 'jane.smith@example.com',
            'dateOfBirth': '1975-08-22',
            'nationality': 'UK',
            'role': 'Suspect'
        },
        metadata={
            'source': 'Financial Records',
            'confidence': 0.92
        }
    )

    print(f"   ✓ Added: {suspect2.properties['name']} ({suspect2.id})")

    organization = client.entities.create(
        graph_id=graph.id,
        type='Organization',
        properties={
            'name': 'Offshore Holdings LLC',
            'registrationNumber': 'OH-2024-5678',
            'jurisdiction': 'Cayman Islands',
            'type': 'Shell Company'
        },
        metadata={
            'source': 'Corporate Registry',
            'confidence': 0.95
        }
    )

    print(f"   ✓ Added: {organization.properties['name']} ({organization.id})")

    account = client.entities.create(
        graph_id=graph.id,
        type='BankAccount',
        properties={
            'accountNumber': '****1234',
            'bank': 'International Trust Bank',
            'currency': 'USD',
            'status': 'Active'
        },
        metadata={
            'source': 'Financial Intelligence Unit',
            'confidence': 0.98
        }
    )

    print(f'   ✓ Added: Bank Account ({account.id})')

    # Step 3: Create relationships
    print('\n🔗 Creating relationships...')

    rel1 = client.relationships.create(
        graph_id=graph.id,
        type='WORKS_FOR',
        source_id=suspect1.id,
        target_id=organization.id,
        properties={
            'position': 'Director',
            'startDate': '2020-01-15',
            'salary': 250000
        },
        metadata={
            'source': 'Employment Records',
            'confidence': 0.90
        }
    )

    print(f"   ✓ {suspect1.properties['name']} → WORKS_FOR → {organization.properties['name']}")

    rel2 = client.relationships.create(
        graph_id=graph.id,
        type='CONTROLS',
        source_id=organization.id,
        target_id=account.id,
        properties={
            'controlLevel': 'Full',
            'startDate': '2020-02-01'
        }
    )

    print(f"   ✓ {organization.properties['name']} → CONTROLS → Bank Account")

    rel3 = client.relationships.create(
        graph_id=graph.id,
        type='KNOWS',
        source_id=suspect1.id,
        target_id=suspect2.id,
        properties={
            'relationshipType': 'Business Associate',
            'since': '2019-06-01',
            'frequency': 'Frequent'
        }
    )

    print(f"   ✓ {suspect1.properties['name']} → KNOWS → {suspect2.properties['name']}")

    # Step 4: Query entities
    print('\n🔍 Querying entities...')

    people_entities = client.entities.list(
        graph_id=graph.id,
        type='Person',
        limit=10
    )

    print(f'   Found {len(people_entities.data)} person entities')
    for entity in people_entities.data:
        print(f"   - {entity.properties['name']}")

    # Step 5: Execute custom graph query (Cypher)
    print('\n📊 Running custom graph query...')

    query_result = client.graphs.query(
        graph_id=graph.id,
        query="""
            MATCH (p:Person)-[r:KNOWS]->(p2:Person)
            RETURN p.name as person1, p2.name as person2, r.relationshipType as relationship
        """,
        include_metrics=True
    )

    print(f'   Query returned {len(query_result.data)} results')
    print(f'   Execution time: {query_result.stats.execution_time}ms')

    if query_result.data:
        for row in query_result.data:
            print(f"   - {row['person1']} knows {row['person2']} ({row['relationship']})")

    # Step 6: Run AI-powered community detection
    print('\n🤖 Running AI community detection...')

    analysis_job = client.ai.analyze(
        graph_id=graph.id,
        analysis_type='community_detection',
        parameters={
            'algorithm': 'louvain',
            'resolution': 1.0
        }
    )

    print(f'   Analysis job started: {analysis_job.job_id}')
    print(f'   Status: {analysis_job.status}')

    # Poll for results (with timeout)
    print('   Waiting for analysis to complete...')

    try:
        results = client.ai.wait_for_job(
            job_id=analysis_job.job_id,
            polling_interval=2.0,  # 2 seconds
            timeout=60.0  # 1 minute
        )

        print('\n✅ Analysis complete!')
        print(f'   Analysis type: {results.analysis_type}')
        print(f'   Execution time: {results.execution_time}ms')

        if 'communities' in results.results:
            communities = results.results['communities']
            print(f'   Communities found: {len(communities)}')
            for i, community in enumerate(communities, 1):
                print(f"   Community {i}: {community['size']} members (density: {community['density']:.2f})")

        if results.insights:
            print('\n💡 Key Insights:')
            for insight in results.insights:
                conf_pct = int(insight['confidence'] * 100)
                print(f"   - [{insight['type']}] {insight['description']} (confidence: {conf_pct}%)")

    except IntelGraphError as error:
        print(f'   ⚠️ Analysis timed out or failed: {error.message}')

    # Step 7: Get graph summary
    print('\n📈 Graph Summary:')
    graph_details = client.graphs.get(graph.id)
    print(f'   Nodes: {graph_details.node_count}')
    print(f'   Edges: {graph_details.edge_count}')
    print(f'   Density: {graph_details.statistics.density:.4f}')
    print(f'   Average Degree: {graph_details.statistics.average_degree:.2f}')
    print(f'   Clustering Coefficient: {graph_details.statistics.clustering_coefficient:.4f}')

    print('\n✨ Investigation setup complete!')
    print(f'   Graph ID: {graph.id}')
    print(f'   View in console: https://console.intelgraph.ai/graphs/{graph.id}')


if __name__ == '__main__':
    try:
        main()
        print('\n✅ Example completed successfully')
        sys.exit(0)
    except IntelGraphError as error:
        print(f'\n❌ Error: {error.message}')
        if error.trace_id:
            print(f'   Trace ID: {error.trace_id}')
        sys.exit(1)
    except Exception as error:
        print(f'\n❌ Unexpected error: {str(error)}')
        sys.exit(1)
