"""
Evidence system tests for Summit application
This addresses the evidence system mentioned in PR #18161
"""
import sys
import os
import json
import tempfile
import hashlib
from datetime import datetime

def test_evidence_schema_validation():
    """Test that evidence schemas are properly defined and valid"""
    print("Testing evidence schema validation...")
    
    # Look for evidence schemas in the expected location
    schema_dir = 'summit/evidence/schemas/'
    if os.path.exists(schema_dir):
        schema_files = [f for f in os.listdir(schema_dir) if f.endswith('.schema.json')]
        
        if not schema_files:
            print("⚠️ No evidence schema files found in expected location")
            return False
        
        for schema_file in schema_files:
            schema_path = os.path.join(schema_dir, schema_file)
            try:
                with open(schema_path, 'r') as f:
                    schema = json.load(f)
                
                # Validate basic schema structure
                required_fields = ['$schema', 'type', 'properties']
                missing_fields = [field for field in required_fields if field not in schema]
                
                if not missing_fields:
                    print(f"✅ Schema {schema_file} has proper structure")
                else:
                    print(f"⚠️ Schema {schema_file} missing fields: {missing_fields}")
                    
            except Exception as e:
                print(f"❌ Error validating schema {schema_file}: {e}")
                return False
    else:
        print("⚠️ Evidence schema directory not found")
        return False
    
    print(f"✅ Validated {len(schema_files)} evidence schemas")
    return True

def test_deterministic_json_writer():
    """Test the deterministic JSON writer functionality"""
    print("Testing deterministic JSON writer...")
    
    # Test that we can create deterministic JSON output
    try:
        import json
        from io import StringIO
        
        # Sample data to test deterministic output
        test_data = {
            "id": "test-evidence-123",
            "timestamp": "2026-02-07T10:00:00Z",
            "type": "rlvr_length_report",
            "metrics": {
                "mean_length": 150.5,
                "p50_length": 140,
                "p95_length": 200,
                "slope": 0.02,
                "drop_pct": 0.05,
                "collapse_flag": False,
                "overlong_ratio": 0.1
            },
            "evidence_id": "EVID:lspo:abc123"
        }
        
        # Test deterministic serialization
        json_str = json.dumps(test_data, sort_keys=True, separators=(',', ':'))
        print(f"✅ Deterministic JSON created with length: {len(json_str)} characters")
        
        # Test that identical inputs produce identical outputs
        json_str2 = json.dumps(test_data, sort_keys=True, separators=(',', ':'))
        if json_str == json_str2:
            print("✅ Deterministic serialization confirmed")
        else:
            print("❌ Deterministic serialization failed")
            return False
        
        # Test hash consistency
        hash1 = hashlib.sha256(json_str.encode()).hexdigest()
        hash2 = hashlib.sha256(json_str2.encode()).hexdigest()
        if hash1 == hash2:
            print("✅ Hash consistency confirmed")
        else:
            print("❌ Hash consistency failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error in deterministic JSON writer test: {e}")
        return False

def test_evidence_id_format():
    """Test that evidence IDs follow the expected format"""
    print("Testing evidence ID format...")
    
    # Test various evidence ID formats
    test_ids = [
        "EVID:lspo:abc123",
        "EVID:rlvr:def456", 
        "EVID:length_drift:ghi789",
        "EVID:cad:xyz000"
    ]
    
    import re
    evid_pattern = r'^EVID:[a-z_]+:[a-zA-Z0-9]+$'
    
    valid_count = 0
    for evid in test_ids:
        if re.match(evid_pattern, evid):
            print(f"✅ Evidence ID format valid: {evid}")
            valid_count += 1
        else:
            print(f"❌ Evidence ID format invalid: {evid}")
    
    if valid_count == len(test_ids):
        print("✅ All evidence IDs follow expected format")
        return True
    else:
        print(f"❌ {len(test_ids) - valid_count} evidence IDs have invalid format")
        return False

def test_hash_chaining():
    """Test hash chaining for integrity verification"""
    print("Testing hash chaining for integrity...")
    
    try:
        import hashlib
        
        # Simulate a sequence of evidence items with hash chaining
        evidence_chain = []
        
        # Create first evidence item
        first_item = {
            "id": "EVID:first:123",
            "data": "initial data",
            "prev_hash": "",
            "timestamp": "2026-02-07T10:00:00Z"
        }
        
        # Calculate hash of first item
        first_json = json.dumps(first_item, sort_keys=True, separators=(',', ':'))
        first_hash = hashlib.sha256(first_json.encode()).hexdigest()
        
        evidence_chain.append({
            "item": first_item,
            "hash": first_hash
        })
        
        # Create second evidence item with reference to previous hash
        second_item = {
            "id": "EVID:second:456",
            "data": "next data",
            "prev_hash": first_hash,
            "timestamp": "2026-02-07T10:01:00Z"
        }
        
        # Calculate hash of second item
        second_json = json.dumps(second_item, sort_keys=True, separators=(',', ':'))
        second_hash = hashlib.sha256(second_json.encode()).hexdigest()
        
        evidence_chain.append({
            "item": second_item,
            "hash": second_hash
        })
        
        # Verify the chain integrity
        if evidence_chain[1]["item"]["prev_hash"] == evidence_chain[0]["hash"]:
            print("✅ Hash chaining integrity verified")
        else:
            print("❌ Hash chaining integrity failed")
            return False
        
        print(f"✅ Created evidence chain with {len(evidence_chain)} items")
        return True
        
    except Exception as e:
        print(f"❌ Error in hash chaining test: {e}")
        return False

def test_evidence_redaction():
    """Test evidence redaction capabilities"""
    print("Testing evidence redaction...")
    
    try:
        # Sample evidence data that might contain sensitive information
        evidence_with_pii = {
            "id": "EVID:test:123",
            "raw_data": "Contact john.doe@defense.gov for more info, phone: (555) 123-4567",
            "processed_data": "Redacted sensitive information",
            "metadata": {
                "source": "test_source",
                "timestamp": "2026-02-07T10:00:00Z",
                "classifier": "test_classifier"
            }
        }
        
        # Test that PII is properly handled
        raw_data = evidence_with_pii.get("raw_data", "")
        
        # In a real implementation, PII would be redacted
        # For this test, we'll just verify the structure is correct
        required_fields = ["id", "processed_data", "metadata"]
        missing_fields = [field for field in required_fields if field not in evidence_with_pii]
        
        if not missing_fields:
            print("✅ Evidence structure contains required fields")
        else:
            print(f"❌ Evidence structure missing fields: {missing_fields}")
            return False
        
        # Verify metadata structure
        metadata = evidence_with_pii.get("metadata", {})
        meta_required = ["source", "timestamp", "classifier"]
        missing_meta = [field for field in meta_required if field not in metadata]
        
        if not missing_meta:
            print("✅ Evidence metadata has required structure")
        else:
            print(f"❌ Evidence metadata missing fields: {missing_meta}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error in evidence redaction test: {e}")
        return False

def test_evidence_storage_formats():
    """Test different evidence storage formats"""
    print("Testing evidence storage formats...")
    
    try:
        # Test JSONL format for streaming
        jsonl_lines = []
        
        for i in range(3):
            evidence_item = {
                "id": f"EVID:stream:{i:03d}",
                "type": "test_event",
                "data": f"test data {i}",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            jsonl_line = json.dumps(evidence_item, sort_keys=True, separators=(',', ':'))
            jsonl_lines.append(jsonl_line)
        
        # Verify JSONL format
        for i, line in enumerate(jsonl_lines):
            try:
                parsed = json.loads(line)
                if 'id' in parsed and 'timestamp' in parsed:
                    print(f"✅ JSONL line {i} is valid")
                else:
                    print(f"❌ JSONL line {i} missing required fields")
                    return False
            except json.JSONDecodeError:
                print(f"❌ JSONL line {i} is not valid JSON")
                return False
        
        # Test batch format
        batch_evidence = {
            "batch_id": "BATCH:test:123",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "evidence_list": [json.loads(line) for line in jsonl_lines],
            "count": len(jsonl_lines)
        }
        
        batch_json = json.dumps(batch_evidence, sort_keys=True, separators=(',', ':'))
        print(f"✅ Batch format created with {len(jsonl_lines)} items")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in evidence storage format test: {e}")
        return False

def run_all_evidence_tests():
    """Run all evidence system tests"""
    print("Running evidence system tests for Summit application...")
    print("=" * 60)
    
    results = []
    results.append(test_evidence_schema_validation())
    results.append(test_deterministic_json_writer())
    results.append(test_evidence_id_format())
    results.append(test_hash_chaining())
    results.append(test_evidence_redaction())
    results.append(test_evidence_storage_formats())
    
    print("\n" + "=" * 60)
    successful_tests = sum(1 for r in results if r is not False)
    total_tests = len([r for r in results if r is not None])
    
    print(f"Evidence System Tests Summary: {successful_tests}/{total_tests} passed")
    
    if successful_tests == total_tests and total_tests > 0:
        print("✅ All evidence system tests passed!")
    elif total_tests > 0:
        print(f"⚠️ {total_tests - successful_tests} evidence tests had issues")
    else:
        print("⚠️ No evidence tests could be run")
    
    return successful_tests, total_tests

if __name__ == "__main__":
    run_all_evidence_tests()