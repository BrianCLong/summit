# Security Best Practices for Summit Platform

## Overview

This document outlines the security best practices implemented across the Summit platform, with a focus on protecting against prompt injection and other input-based attacks using the Rule of Two principle.

## Rule of Two Implementation

### Core Principle

Following Meta's "Agents Rule of Two" principle, ensure that no single component satisfies more than two of the following three capabilities:

1. Processing untrusted input
2. Accessing sensitive systems
3. Changing state or communicating externally

### Implemented Services

#### API Layer (`api/main.py`)

- All endpoints now sanitize untrusted input before processing
- Input validation and sanitization via `ml.app.security` module
- Comprehensive audit logging for security events

#### Orchestrator Service (`intelgraph_psyops_orchestrator.py`)

- Separated input validation from state change operations
- Created distinct `InputValidationService` and `StateChangeService`
- Added security event logging and audit trails

#### Cognitive Insights Service (`cognitive-insights/app/api.py`)

- Added input sanitization to `/analyze` endpoint
- Maintained existing ethics/persuasion validation
- Added audit logging for analysis requests

#### Copilot Service (`copilot/app.py`)

- Input sanitization for NER extraction endpoint
- Input sanitization for link suggestion endpoint
- Added security event logging

#### Ingest Service (`services/ingest/ingest/app/main.py`)

- Input sanitization for ingestion jobs
- Protection against malicious source content
- Added audit logging

#### RAG Service (`services/rag/src/main.py`)

- Input sanitization for search, query, and Cypher endpoints
- Protected against prompt injection attacks
- Added comprehensive audit logging

#### AI Copilot Service (`services/ai-copilot/src/main.py`)

- Input sanitization for query and RAG endpoints
- Maintained existing policy checks
- Added audit logging

## Input Sanitization

### Security Module

Input sanitization is performed using the `ml.app.security` module which includes:

```python
from ml.app.security import sanitize_input, audit_security_event

# Sanitize untrusted input
sanitized_data = sanitize_input(untrusted_input)

# Log security events
audit_security_event("EVENT_TYPE", {"details": "about the event"}, "severity")
```

### Sanitization Rules

The security module implements the following sanitization:

- Remove dangerous characters: `<`, `>`, `"`, `'`, `&`, null bytes
- Limit string length to 10,000 characters
- Limit list size to 1,000 items
- Sanitize dictionary keys and values recursively
- Apply content length limits

## Security Event Logging

All services that process untrusted input now include security event logging:

- Input validation events
- API request events
- Potential security incidents
- Audit trails for compliance

## Development Guidelines

### Adding New Endpoints

When adding new endpoints that process untrusted input:

1. Import the security module: `from ml.app.security import sanitize_input, audit_security_event`
2. Sanitize all untrusted input before processing
3. Log security events for audit purposes
4. Ensure compliance with Rule of Two architecture

### Example Implementation

```python
@app.post("/new-endpoint")
async def new_endpoint(request: MyRequestModel):
    # Apply Rule of Two: Sanitize untrusted input before processing
    sanitized_input = sanitize_input(request.dict())
    sanitized_request = MyRequestModel(**sanitized_input)

    # Log security event for audit trail
    audit_security_event(
        "NEW_ENDPOINT_REQUEST",
        {"input_length": len(sanitized_input)},
        "low"
    )

    # Process sanitized input
    result = process_data(sanitized_request)
    return result
```

## Testing Security Measures

### Unit Tests

Include tests that verify:

- Input sanitization works correctly
- Malicious input is properly handled
- Security events are logged
- Rule of Two compliance is maintained

### Security Testing

- Test with various injection payloads
- Verify that sanitization doesn't break legitimate functionality
- Ensure audit logs capture all security-relevant events

## Incident Response

### Detection

Security events are logged and should be monitored for:

- Repeated validation failures
- Suspicious input patterns
- Unusual request volumes
- Potential injection attempts

### Response Process

1. Review security logs for the incident
2. Assess the scope and impact
3. Implement additional protections if necessary
4. Update documentation and tests

## Compliance and Monitoring

### Audit Trail

All input processing services maintain audit trails that include:

- What input was received (sanitized)
- When processing occurred
- What actions were taken
- Any security events triggered

### Monitoring

- Implement alerting for security events
- Monitor for unusual patterns
- Regular review of audit logs
- Compliance reporting

## Maintaining Security

### Code Reviews

- Verify Rule of Two compliance
- Check that all untrusted input is sanitized
- Ensure audit logging is implemented
- Review for potential security vulnerabilities

### Regular Updates

- Keep security dependencies updated
- Review and update sanitization rules
- Update documentation as needed
- Test security measures regularly

This security framework provides robust protection against prompt injection and other input-based attacks while maintaining the functionality of the Summit platform.
