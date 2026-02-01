import json
import os
import sys
try:
    from jsonschema import validate, ValidationError
except ImportError:
    print("jsonschema not installed. Please install it.")
    sys.exit(1)

SCHEMA_DIR = "schemas/protocols"
FIXTURE_DIR = "tests/fixtures/protocols"

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def verify():
    schemas = {}
    # Load Schemas
    try:
        schemas['mcp'] = load_json(os.path.join(SCHEMA_DIR, "mcp_tool_call.v1.schema.json"))
        schemas['a2a'] = load_json(os.path.join(SCHEMA_DIR, "a2a_task_envelope.v1.schema.json"))
    except FileNotFoundError as e:
        print(f"Error loading schemas: {e}")
        sys.exit(1)

    failures = 0

    # Verify MCP
    print("Verifying MCP Protocols...")
    try:
        valid_mcp = load_json(os.path.join(FIXTURE_DIR, "mcp/valid.tool_call.json"))
        validate(instance=valid_mcp, schema=schemas['mcp'])
        print("  PASS: Valid MCP Tool Call")
    except Exception as e:
        print(f"  FAIL: Valid MCP Tool Call failed: {e}")
        failures += 1

    try:
        invalid_mcp = load_json(os.path.join(FIXTURE_DIR, "mcp/invalid.tool_call.missing_tool.json"))
        validate(instance=invalid_mcp, schema=schemas['mcp'])
        print("  FAIL: Invalid MCP Tool Call SHOULD have failed but PASSED")
        failures += 1
    except ValidationError:
        print("  PASS: Invalid MCP Tool Call correctly failed validation")
    except Exception as e:
        print(f"  FAIL: Invalid MCP Tool Call raised unexpected error: {e}")
        failures += 1

    # Verify A2A
    print("Verifying A2A Protocols...")
    try:
        valid_a2a = load_json(os.path.join(FIXTURE_DIR, "a2a/valid.task_envelope.json"))
        validate(instance=valid_a2a, schema=schemas['a2a'])
        print("  PASS: Valid A2A Task Envelope")
    except Exception as e:
        print(f"  FAIL: Valid A2A Task Envelope failed: {e}")
        failures += 1

    try:
        invalid_a2a = load_json(os.path.join(FIXTURE_DIR, "a2a/invalid.task_envelope.bad_version.json"))
        validate(instance=invalid_a2a, schema=schemas['a2a'])
        print("  FAIL: Invalid A2A Task Envelope SHOULD have failed but PASSED")
        failures += 1
    except ValidationError:
        print("  PASS: Invalid A2A Task Envelope correctly failed validation")
    except Exception as e:
        print(f"  FAIL: Invalid A2A Task Envelope raised unexpected error: {e}")
        failures += 1

    if failures > 0:
        sys.exit(1)
    else:
        print("All Protocol Checks Passed.")

if __name__ == "__main__":
    verify()
