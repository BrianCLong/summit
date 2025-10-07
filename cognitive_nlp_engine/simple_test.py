#!/usr/bin/env python3
"""
Simple test script for the Cognitive NLP Engine components.
"""

import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_query_parser():
    """Test the query parser component."""
    logger.info("Testing Query Parser...")
    
    try:
        # Add current directory to path
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        from nlu.query_parser import SecurityQueryParser
        
        # Create parser instance
        parser = SecurityQueryParser()
        
        # Test queries
        test_queries = [
            "Find all threats related to 192.168.1.100 from yesterday",
            "Analyze suspicious behavior on server-web01",
            "Predict risk for accounts in finance department",
            "Explain the incident involving user john.doe@example.com",
            "Compare security posture between staging and production environments",
            "Generate hypotheses for the recent data exfiltration attempt",
            "Validate evidence from the compromised endpoint",
            "Simulate scenario with ransomware payload on critical servers"
        ]
        
        for i, query_text in enumerate(test_queries, 1):
            logger.info("Parsing query %d: %s", i, query_text)
            parsed = parser.parse_query(query_text)
            logger.info("  Intent: %s", parsed.intent)
            logger.info("  Entities: %s", parsed.entities)
            logger.info("  Confidence: %.2f", parsed.confidence)
            logger.info("  Temporal Context: %s", parsed.temporal_context)
        
        logger.info("✅ Query Parser test completed successfully")
        return True
        
    except Exception as e:
        logger.error("❌ Query Parser test failed: %s", e)
        return False

def test_dialogue_manager():
    """Test the dialogue manager component."""
    logger.info("Testing Dialogue Manager...")
    
    try:
        from dialogue.manager import DialogueManager
        
        # Create dialogue manager instance
        dialogue_manager = DialogueManager()
        
        # Test starting a dialogue
        user_id = "test_user_123"
        conversation_id = dialogue_manager.start_dialogue(user_id)
        logger.info("✅ Started dialogue: %s", conversation_id)
        
        # Test processing turns
        test_turns = [
            "Find threats related to suspicious IP 192.168.1.100",
            "Now analyze the behavior of user admin",
            "Compare this with normal user activity patterns"
        ]
        
        # Create a simple parser for test data
        from nlu.query_parser import SecurityQueryParser
        parser = SecurityQueryParser()
        
        for i, turn_text in enumerate(test_turns, 1):
            logger.info("Processing turn %d: %s", i, turn_text)
            
            # Parse the query first
            parsed = parser.parse_query(turn_text)
            
            # Process the dialogue turn
            turn = dialogue_manager.process_turn(conversation_id, turn_text, parsed.__dict__)
            logger.info("  Turn ID: %s", turn.turn_id)
            logger.info("  Confidence: %.2f", turn.confidence)
        
        # Test getting context
        context = dialogue_manager.get_context(conversation_id)
        if context:
            logger.info("✅ Retrieved context for conversation %s", conversation_id)
            logger.info("  Topic: %s", context.current_topic)
            logger.info("  Entities: %s", context.entities)
            logger.info("  History turns: %d", len(context.conversation_history))
        
        # Test listing conversations
        conversations = dialogue_manager.get_active_conversations(user_id)
        logger.info("Active conversations for user %s: %d", user_id, len(conversations))
        
        # Test ending dialogue
        ended_context = dialogue_manager.end_dialogue(conversation_id)
        if ended_context:
            logger.info("✅ Ended dialogue: %s", conversation_id)
        
        logger.info("✅ Dialogue Manager test completed successfully")
        return True
        
    except Exception as e:
        logger.error("❌ Dialogue Manager test failed: %s", e)
        return False

def test_knowledge_graph():
    """Test the knowledge graph interface."""
    logger.info("Testing Knowledge Graph Interface...")
    
    try:
        # Import the class directly to avoid global variable issues
        sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'knowledge_graph'))
        from interface import KnowledgeGraphInterface, GraphQuery
        
        # Create knowledge graph interface instance
        kg_interface = KnowledgeGraphInterface()
        
        # Test mock queries
        test_queries = [
            GraphQuery(
                cypher="MATCH (t:Threat) WHERE t.type = $threat_type RETURN t.name, t.confidence",
                parameters={"threat_type": "APT"},
                description="Find APT threats",
                expected_return=["t.name", "t.confidence"]
            ),
            GraphQuery(
                cypher="MATCH (i:Ioc) WHERE i.type = $ioc_type RETURN i.value, i.threat_type",
                parameters={"ioc_type": "ip"},
                description="Find IP IOCs",
                expected_return=["i.value", "i.threat_type"]
            )
        ]
        
        for i, graph_query in enumerate(test_queries, 1):
            logger.info("Executing mock query %d: %s", i, graph_query.description)
            result = kg_interface.query_graph(graph_query)
            logger.info("  Execution time: %.3f seconds", result.execution_time)
            logger.info("  Rows returned: %d", result.row_count)
            if result.data:
                logger.info("  Sample data: %s", result.data[0] if result.data else "No data")
        
        logger.info("✅ Knowledge Graph Interface test completed successfully")
        return True
        
    except Exception as e:
        logger.error("❌ Knowledge Graph Interface test failed: %s", e)
        return False

def main():
    """Main test function."""
    logger.info("Starting Cognitive NLP Engine component tests...")
    
    # Run individual component tests
    tests = [
        ("Query Parser", test_query_parser),
        ("Dialogue Manager", test_dialogue_manager),
        ("Knowledge Graph Interface", test_knowledge_graph)
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info("=" * 50)
        logger.info("Running %s test", test_name)
        logger.info("=" * 50)
        
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                logger.info("✅ %s test PASSED", test_name)
            else:
                logger.info("❌ %s test FAILED", test_name)
        except Exception as e:
            logger.error("💥 %s test ERROR: %s", test_name, e)
            results.append((test_name, False))
    
    # Print summary
    logger.info("=" * 50)
    logger.info("TEST SUMMARY")
    logger.info("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info("%s: %s", test_name, status)
        if result:
            passed += 1
    
    logger.info("=" * 50)
    logger.info("Overall: %d/%d tests passed", passed, total)
    
    if passed == total:
        logger.info("🎉 All tests passed!")
        return 0
    else:
        logger.info("⚠️  Some tests failed. Please check the logs above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())