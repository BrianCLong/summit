#!/usr/bin/env python3
"""
Demo script showcasing the capabilities of the Cognitive NLP Engine.
"""

import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def demo_conversation():
    """Demonstrate a complete conversation with the Cognitive NLP Engine."""
    logger.info("=" * 60)
    logger.info("COGNITIVE NLP ENGINE DEMONSTRATION")
    logger.info("=" * 60)
    
    # Add current directory to path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    # Import components
    from nlu.query_parser import SecurityQueryParser
    from dialogue.manager import DialogueManager
    
    # Initialize components
    parser = SecurityQueryParser()
    dialogue_manager = DialogueManager()
    
    # Start a new dialogue
    user_id = "demo_user"
    conversation_id = dialogue_manager.start_dialogue(user_id)
    logger.info(f"📝 Started new dialogue: {conversation_id}")
    
    # Demo conversation turns
    demo_queries = [
        "Find all threats related to suspicious IP 192.168.1.100 from yesterday",
        "Now analyze the behavior of user admin on that system",
        "Compare this with normal user activity patterns",
        "Generate hypotheses for the recent data exfiltration attempt",
        "Validate evidence from the compromised endpoint",
        "Simulate scenario with ransomware payload on critical servers"
    ]
    
    logger.info("\n🗣️  DEMO CONVERSATION:")
    logger.info("-" * 40)
    
    for i, query_text in enumerate(demo_queries, 1):
        logger.info(f"\n👤 User Turn {i}: {query_text}")
        
        # Parse the query
        parsed = parser.parse_query(query_text)
        logger.info(f"🤖 Parsed Intent: {parsed.intent}")
        if parsed.entities:
            logger.info(f"   Entities: {parsed.entities}")
        logger.info(f"   Confidence: {parsed.confidence:.2f}")
        
        # Process dialogue turn
        turn = dialogue_manager.process_turn(conversation_id, query_text, parsed.__dict__)
        
        # Generate response based on intent
        response = generate_demo_response(parsed.intent, parsed.entities)
        logger.info(f"🤖 System Response: {response}")
    
    # Show conversation context
    context = dialogue_manager.get_context(conversation_id)
    if context:
        logger.info(f"\n📈 CONVERSATION CONTEXT:")
        logger.info(f"   Current Topic: {context.current_topic}")
        logger.info(f"   Entities Tracked: {len(context.entities)} types")
        for entity_type, values in context.entities.items():
            logger.info(f"     - {entity_type}: {len(values)} values")
        logger.info(f"   Conversation History: {len(context.conversation_history)} turns")
    
    logger.info("\n" + "=" * 60)
    logger.info("DEMONSTRATION COMPLETE")
    logger.info("=" * 60)

def generate_demo_response(intent: str, entities: dict) -> str:
    """Generate a demo response based on parsed intent and entities."""
    responses = {
        'find_threats': "I've identified several potential threats matching your criteria. Would you like me to prioritize them by risk score?",
        'analyze_behavior': "Analyzing user behavior patterns now. I'm comparing against baseline activity profiles.",
        'compare_scenarios': "Comparing current activity with established baselines. Significant deviations detected in network access patterns.",
        'generate_hypothesis': "Generating investigative hypotheses based on observed anomalies. I've created 3 potential explanations.",
        'validate_evidence': "Validating evidence chain integrity. All digital artifacts verified with cryptographic hashes.",
        'simulate_scenario': "Running simulation of ransomware deployment scenario. Predicting 85% containment success with current defenses.",
        'predict_risk': "Assessing risk factors in your query. Calculating probability distributions for identified threats.",
        'explain_incident': "Explaining incident timeline and root causes. Cross-referencing with threat intelligence databases."
    }
    
    base_response = responses.get(intent, "I understand your request and am processing it now.")
    
    # Add entity-specific information if available
    if entities:
        entity_info = []
        for entity_type, values in entities.items():
            if values:
                entity_info.append(f"{entity_type}: {', '.join(values[:2])}")  # Limit to 2 values
        
        if entity_info:
            return f"{base_response} Focusing on {', '.join(entity_info)}."
    
    return base_response

def demo_knowledge_graph():
    """Demonstrate knowledge graph capabilities."""
    logger.info("\n🧠 KNOWLEDGE GRAPH DEMONSTRATION:")
    logger.info("-" * 40)
    
    from knowledge_graph.interface import KnowledgeGraphInterface, GraphQuery
    
    # Initialize knowledge graph interface
    kg_interface = KnowledgeGraphInterface()
    
    # Demo queries
    demo_queries = [
        GraphQuery(
            cypher="MATCH (t:Threat) WHERE t.type = 'APT' RETURN t.name, t.confidence LIMIT 3",
            parameters={},
            description="Find APT threats",
            expected_return=["t.name", "t.confidence"]
        ),
        GraphQuery(
            cypher="MATCH (i:Ioc) WHERE i.type = 'ip' RETURN i.value, i.threat_type LIMIT 5",
            parameters={},
            description="Find IP IOCs",
            expected_return=["i.value", "i.threat_type"]
        )
    ]
    
    for i, graph_query in enumerate(demo_queries, 1):
        logger.info(f"\n🔍 Graph Query {i}: {graph_query.description}")
        result = kg_interface.query_graph(graph_query)
        logger.info(f"   Execution time: {result.execution_time:.3f}s")
        logger.info(f"   Results returned: {result.row_count}")
        if result.data:
            logger.info(f"   Sample result: {result.data[0]}")

def main():
    """Main demo function."""
    try:
        # Run conversation demo
        demo_conversation()
        
        # Run knowledge graph demo
        demo_knowledge_graph()
        
        logger.info("\n🚀 COGNITIVE NLP ENGINE READY FOR DEPLOYMENT")
        logger.info("   Features demonstrated:")
        logger.info("   • Natural Language Query Parsing")
        logger.info("   • Context-Aware Dialogue Management")
        logger.info("   • Knowledge Graph Integration")
        logger.info("   • Multi-Turn Conversation Support")
        logger.info("   • Entity Extraction & Intent Recognition")
        
        return 0
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())