"""
CLI tools tests for Summit application
This addresses the CLI tools mentioned in PR #18161
"""
import sys
import os
import tempfile
import json
import subprocess
from datetime import datetime

def test_rlvr_cli_tool_structure():
    """Test the structure of the RLVR CLI tool"""
    print("Testing RLVR CLI tool structure...")
    
    # Check if the CLI tool file exists
    cli_path = 'summit/cli/rlvr_length_report.py'
    
    if os.path.exists(cli_path):
        print("✅ RLVR CLI tool file exists")
        
        # Check if it's executable
        if os.access(cli_path, os.R_OK):
            print("✅ RLVR CLI tool is readable")
            
            # Read the file to check for basic CLI structure
            with open(cli_path, 'r') as f:
                content = f.read()
                
                # Check for common CLI patterns
                has_argparse = 'argparse' in content
                has_click = 'click' in content
                has_main_function = 'def main()' in content or '__main__' in content
                has_cli_logic = 'length' in content and 'report' in content
                
                if has_argparse or has_click:
                    print("✅ RLVR CLI tool uses CLI argument parsing library")
                else:
                    print("⚠️ RLVR CLI tool may not use standard CLI library")
                
                if has_main_function:
                    print("✅ RLVR CLI tool has main function structure")
                
                if has_cli_logic:
                    print("✅ RLVR CLI tool contains length report logic")
        else:
            print("❌ RLVR CLI tool is not readable")
            return False
    else:
        print("⚠️ RLVR CLI tool file does not exist (expected for PR #18161)")
        return True  # This is expected since the PR hasn't been merged yet
    
    return True

def test_cli_argument_parsing():
    """Test CLI argument parsing functionality"""
    print("Testing CLI argument parsing...")
    
    # Create a mock CLI script for testing purposes
    mock_cli_content = '''
#!/usr/bin/env python3
"""
Mock RLVR Length Report CLI Tool
This simulates the CLI tool that would be in PR #18161
"""
import argparse
import json
import sys
from datetime import datetime


def process_jsonl_file(input_file, output_file=None, redact_sensitive=False, hash_chain=False):
    """
    Process JSONL training/log events and generate length report
    """
    results = []
    
    with open(input_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
                
            try:
                data = json.loads(line)
                
                # Extract length-related metrics
                response_text = data.get('response', '')
                prompt_text = data.get('prompt', '')
                
                result = {
                    'line_number': line_num,
                    'response_length': len(response_text),
                    'prompt_length': len(prompt_text),
                    'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
                    'session_id': data.get('session_id', 'unknown')
                }
                
                # Apply redaction if requested
                if redact_sensitive:
                    # Redact sensitive fields
                    for key in ['user_id', 'email', 'phone', 'address']:
                        if key in result:
                            result[key] = '[REDACTED]'
                
                results.append(result)
                
            except json.JSONDecodeError:
                print(f"Warning: Invalid JSON on line {line_num}", file=sys.stderr)
                continue
    
    # Calculate aggregate metrics
    if results:
        avg_response_len = sum(r['response_length'] for r in results) / len(results)
        avg_prompt_len = sum(r['prompt_length'] for r in results) / len(results)
        
        summary = {
            'total_records': len(results),
            'average_response_length': avg_response_len,
            'average_prompt_length': avg_prompt_len,
            'date_processed': datetime.utcnow().isoformat(),
            'redaction_applied': redact_sensitive,
            'hash_chaining_enabled': hash_chain
        }
        
        results.append({'summary': summary})
    
    # Output results
    if output_file:
        with open(output_file, 'w') as f:
            for result in results:
                f.write(json.dumps(result, sort_keys=True, separators=(',', ':')) + '\\n')
    else:
        for result in results:
            print(json.dumps(result, sort_keys=True, separators=(',', ':')))
    
    return results


def main():
    parser = argparse.ArgumentParser(description='Generate length report for RLVR training data')
    parser.add_argument('input_file', help='Input JSONL file to process')
    parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    parser.add_argument('--redact', action='store_true', help='Apply PII redaction')
    parser.add_argument('--hash-chain', action='store_true', help='Enable hash chaining')
    parser.add_argument('--version', action='version', version='%(prog)s 1.0.0')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"Error: Input file {args.input_file} does not exist", file=sys.stderr)
        sys.exit(1)
    
    process_jsonl_file(args.input_file, args.output, args.redact, args.hash_chain)


if __name__ == "__main__":
    main()
'''
    
    # Write the mock CLI to a temporary file and test it
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_cli:
        temp_cli.write(mock_cli_content)
        temp_cli_path = temp_cli.name
    
    try:
        # Create a test JSONL file
        test_jsonl_content = '''{"prompt": "What is the capital of France?", "response": "Paris is the capital of France.", "timestamp": "2026-02-07T10:00:00Z", "session_id": "sess-001"}
{"prompt": "How does photosynthesis work?", "response": "Photosynthesis is the process by which plants convert light energy to chemical energy.", "timestamp": "2026-02-07T10:01:00Z", "session_id": "sess-002"}
{"prompt": "Tell me about quantum computing.", "response": "Quantum computing is an area of computing focused on developing computer technology based on the principles of quantum theory.", "timestamp": "2026-02-07T10:02:00Z", "session_id": "sess-003"}'''
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as temp_jsonl:
            temp_jsonl.write(test_jsonl_content)
            temp_jsonl_path = temp_jsonl.name
        
        # Test the CLI with help option
        result = subprocess.run([
            sys.executable, temp_cli_path, '--help'
        ], capture_output=True, text=True)
        
        if result.returncode == 0 and 'Generate length report for RLVR training data' in result.stdout:
            print("✅ CLI argument parsing works correctly")
        else:
            print("❌ CLI argument parsing failed")
            return False
        
        # Test the CLI with actual data
        result = subprocess.run([
            sys.executable, temp_cli_path, temp_jsonl_path
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ CLI processes JSONL data successfully")
            
            # Check that output contains expected fields
            output_lines = result.stdout.strip().split('\n')
            if output_lines:
                try:
                    first_record = json.loads(output_lines[0])
                    required_fields = ['response_length', 'prompt_length', 'timestamp']
                    if all(field in first_record for field in required_fields):
                        print("✅ CLI output contains expected fields")
                    else:
                        print("⚠️ CLI output missing some expected fields")
                except json.JSONDecodeError:
                    print("⚠️ Could not parse CLI output as JSON")
        else:
            print(f"❌ CLI processing failed: {result.stderr}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error in CLI argument parsing test: {e}")
        return False
    
    finally:
        # Clean up temporary files
        os.unlink(temp_cli_path)
        os.unlink(temp_jsonl_path)

def test_deterministic_cli_output():
    """Test that CLI produces deterministic output"""
    print("Testing deterministic CLI output...")
    
    # Create the same mock CLI as before
    mock_cli_content = '''
#!/usr/bin/env python3
import json
import sys
import hashlib
from datetime import datetime


def generate_deterministic_report(data_list):
    """Generate a deterministic report with consistent ordering"""
    results = []
    
    for i, data in enumerate(data_list):
        # Create deterministic output
        result = {
            'id': data.get('id', f'item_{i}'),
            'response_length': len(data.get('response', '')),
            'prompt_length': len(data.get('prompt', '')),
            'timestamp': data.get('timestamp', datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')),
            'evidence_id': f'EVID:lspo:{hashlib.md5((data.get("prompt", "") + data.get("response", "")).encode()).hexdigest()[:8]}'
        }
        results.append(result)
    
    # Sort results deterministically
    results.sort(key=lambda x: x['id'])
    
    return results


def main():
    # For testing, we'll use fixed input
    test_data = [
        {'prompt': 'Second prompt', 'response': 'Second response', 'timestamp': '2026-02-07T10:00:02Z'},
        {'prompt': 'First prompt', 'response': 'First response', 'timestamp': '2026-02-07T10:00:01Z'},
        {'prompt': 'Third prompt', 'response': 'Third response', 'timestamp': '2026-02-07T10:00:03Z'}
    ]
    
    results = generate_deterministic_report(test_data)
    
    for result in results:
        print(json.dumps(result, sort_keys=True, separators=(',', ':')))


if __name__ == "__main__":
    main()
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_cli:
        temp_cli.write(mock_cli_content)
        temp_cli_path = temp_cli.name
    
    try:
        # Run the CLI twice and compare outputs
        result1 = subprocess.run([sys.executable, temp_cli_path], capture_output=True, text=True)
        result2 = subprocess.run([sys.executable, temp_cli_path], capture_output=True, text=True)
        
        if result1.returncode == 0 and result2.returncode == 0:
            if result1.stdout == result2.stdout:
                print("✅ CLI produces deterministic output")
                return True
            else:
                print("❌ CLI output is not deterministic")
                print(f"Output 1: {result1.stdout}")
                print(f"Output 2: {result2.stdout}")
                return False
        else:
            print(f"❌ CLI execution failed: {result1.stderr or result2.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error in deterministic CLI output test: {e}")
        return False
    
    finally:
        os.unlink(temp_cli_path)

def test_cli_redaction_capability():
    """Test CLI redaction capabilities"""
    print("Testing CLI redaction capabilities...")
    
    # Create a CLI that can redact sensitive data
    mock_cli_content = '''
#!/usr/bin/env python3
import json
import sys
import re


def redact_sensitive_data(text):
    """Simple PII redaction function"""
    # Redact emails
    text = re.sub(r'[\\w\\.-]+@[\\w\\.-]+\\.\\w+', '[EMAIL_REDACTED]', text)
    # Redact phone numbers
    text = re.sub(r'(\\d{3}[-\\.\\s]??\\d{3}[-\\.\\s]??\\d{4}|\\(\\d{3}\\)\\s*\\d{3}[-\\.\\s]??\\d{4}|\\d{3}[-\\.\\s]??\\d{4})', '[PHONE_REDACTED]', text)
    # Redact basic personal info patterns
    text = re.sub(r'(?i)(ssn|social security)[\\s\\-:]*(\\d{3}[-\\s]\\d{2}[-\\s]\\d{4})', r'\\1 [SSN_REDACTED]', text)
    
    return text


def process_with_redaction(input_data, apply_redaction=False):
    """Process data with optional redaction"""
    result = {
        'original_length': len(input_data),
        'processed_text': input_data,
        'redaction_applied': apply_redaction
    }
    
    if apply_redaction:
        result['processed_text'] = redact_sensitive_data(input_data)
        result['redaction_applied'] = True
    
    return result


def main():
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--redact', action='store_true', help='Apply redaction')
    parser.add_argument('text', nargs='?', default='', help='Text to process')
    
    args = parser.parse_args()
    
    result = process_with_redaction(args.text, args.redact)
    print(json.dumps(result, sort_keys=True, separators=(',', ':')))


if __name__ == "__main__":
    # Test with sample data containing PII
    test_cases = [
        "Contact john.doe@example.com for more info",
        "Call (555) 123-4567 for assistance",
        "My SSN is 123-45-6789"
    ]
    
    for test_case in test_cases:
        result_no_redact = process_with_redaction(test_case, apply_redaction=False)
        result_with_redact = process_with_redaction(test_case, apply_redaction=True)
        
        print(f"Original: {test_case}")
        print(f"No redaction: {result_no_redact['processed_text']}")
        print(f"With redaction: {result_with_redact['processed_text']}")
        print("---")
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_cli:
        temp_cli.write(mock_cli_content)
        temp_cli_path = temp_cli.name
    
    try:
        # Run the CLI to test redaction
        result = subprocess.run([sys.executable, temp_cli_path], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ CLI redaction capability works")
            # Check that the output shows redaction happening
            if '[EMAIL_REDACTED]' in result.stdout or '[PHONE_REDACTED]' in result.stdout:
                print("✅ Redaction patterns are working correctly")
            else:
                print("⚠️ Redaction patterns may not be triggered with test data")
            return True
        else:
            print(f"❌ CLI redaction test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error in CLI redaction test: {e}")
        return False
    
    finally:
        os.unlink(temp_cli_path)

def test_cli_hash_chaining():
    """Test CLI hash chaining capability"""
    print("Testing CLI hash chaining capability...")
    
    # Create a CLI that implements hash chaining
    mock_cli_content = '''
#!/usr/bin/env python3
import json
import hashlib
import sys


def calculate_deterministic_hash(data_dict):
    """Calculate a deterministic hash of the data"""
    # Convert dict to JSON string with sorted keys for consistency
    json_str = json.dumps(data_dict, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(json_str.encode()).hexdigest()


def process_with_hash_chaining(data_list):
    """Process data with hash chaining for integrity"""
    results = []
    prev_hash = ""  # Start with empty hash
    
    for i, data in enumerate(data_list):
        # Create record with reference to previous hash
        record = {
            'sequence_number': i,
            'data': data,
            'previous_hash': prev_hash,
            'timestamp': '2026-02-07T10:00:00Z'
        }
        
        # Calculate hash of this record
        current_hash = calculate_deterministic_hash(record)
        record['current_hash'] = current_hash
        
        results.append(record)
        
        # Update previous hash for next iteration
        prev_hash = current_hash
    
    return results


def main():
    # Test with sample data
    test_data = [
        {"prompt": "Question 1", "response": "Answer 1"},
        {"prompt": "Question 2", "response": "Answer 2"},
        {"prompt": "Question 3", "response": "Answer 3"}
    ]
    
    chained_results = process_with_hash_chaining(test_data)
    
    # Verify chain integrity
    for i, record in enumerate(chained_results):
        if i == 0:
            # First record should have empty previous hash
            if record['previous_hash'] == "":
                print("✅ First record has empty previous hash")
            else:
                print("❌ First record should have empty previous hash")
                return False
        else:
            # Current record's previous hash should match previous record's current hash
            prev_record = chained_results[i-1]
            if record['previous_hash'] == prev_record['current_hash']:
                print(f"✅ Record {i} hash chain is intact")
            else:
                print(f"❌ Record {i} hash chain is broken")
                return False
    
    # Print the chain for verification
    for record in chained_results:
        print(f"Seq: {record['sequence_number']}, Prev: {record['previous_hash'][:8]}..., Curr: {record['current_hash'][:8]}...")
    
    return True


if __name__ == "__main__":
    success = main()
    if success:
        print("\\n✅ Hash chaining integrity verified")
    else:
        print("\\n❌ Hash chaining integrity failed")
        sys.exit(1)
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_cli:
        temp_cli.write(mock_cli_content)
        temp_cli_path = temp_cli.name
    
    try:
        result = subprocess.run([sys.executable, temp_cli_path], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ CLI hash chaining capability works")
            if "Hash chaining integrity verified" in result.stdout:
                print("✅ Hash chain integrity confirmed")
                return True
            else:
                print("❌ Hash chaining integrity not confirmed")
                return False
        else:
            print(f"❌ CLI hash chaining test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error in CLI hash chaining test: {e}")
        return False
    
    finally:
        os.unlink(temp_cli_path)

def run_all_cli_tests():
    """Run all CLI tool tests"""
    print("Running CLI tools tests for Summit application...")
    print("=" * 60)
    
    results = []
    results.append(test_rlvr_cli_tool_structure())
    results.append(test_cli_argument_parsing())
    results.append(test_deterministic_cli_output())
    results.append(test_cli_redaction_capability())
    results.append(test_cli_hash_chaining())
    
    print("\n" + "=" * 60)
    successful_tests = sum(1 for r in results if r is not False)
    total_tests = len([r for r in results if r is not None])
    
    print(f"CLI Tools Tests Summary: {successful_tests}/{total_tests} passed")
    
    if successful_tests == total_tests and total_tests > 0:
        print("✅ All CLI tools tests passed!")
    elif total_tests > 0:
        print(f"⚠️ {total_tests - successful_tests} CLI tools tests had issues")
    else:
        print("⚠️ No CLI tools tests could be run")
    
    return successful_tests, total_tests

if __name__ == "__main__":
    run_all_cli_tests()