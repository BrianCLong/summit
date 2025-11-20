# Rule of Two Security Implementation

## Overview

This document details the implementation of Meta's "Agents Rule of Two" principle in the Summit platform. The Rule of Two asserts that agents should satisfy at most two of the following three capabilities:

1. Processing untrusted input
2. Accessing sensitive systems
3. Changing state or communicating externally

This architectural approach minimizes breach risk by preventing all three capabilities from being concentrated in a single component.

## Implementation in Summit

### Orchestrator Service (`intelgraph_psyops_orchestrator.py`)

**Before**: The orchestrator handled all three capabilities simultaneously:

- Processed untrusted input from Kafka messages
- Accessed sensitive Neo4j and Postgres databases
- Changed state and communicated externally via PsyOps engine

**After**: The service now implements a clear separation of concerns:

#### Input Validation Service

- Only processes untrusted input
- Sanitizes and validates all incoming data using the security module
- Does NOT access sensitive systems or change state
- Implements audit logging for security events

#### State Change Service

- Only changes state or communicates externally
- Does NOT process untrusted input directly (only accepts pre-validated data)
- Uses secure clients to access sensitive systems when needed
- Maintains audit trails of all operations

### API Layer (`api/main.py`)

**Before**: API endpoints directly processed untrusted input and accessed sensitive systems

**After**: API endpoints now implement input sanitization before any processing:

- Added security module imports: `sanitize_input`, `audit_security_event`
- All POST endpoints now sanitize untrusted input before processing
- Added audit logging for security events
- Maintained API compatibility while improving security

### Cognitive Insights Service (`cognitive-insights/app/api.py`)

**Added**: Input sanitization to the `/analyze` endpoint that processes text items

- Sanitizes request data before analysis
- Maintains existing ethics/persuasion validation
- Adds audit logging for analysis requests

### Copilot Service (`copilot/app.py`)

**Added**: Input sanitization to both NER and link suggestion endpoints

- `/ner/extract` endpoint sanitizes text input before NER processing
- `/links/suggest` endpoint sanitizes entity data before relationship inference
- Both endpoints include audit logging

### Ingest Service (`services/ingest/ingest/app/main.py`)

**Added**: Input sanitization to ingestion jobs

- Sanitizes source, schema_map, and redaction_rules fields
- Protects against malicious content in ingestion requests
- Includes audit logging for job creation

### RAG Service (`services/rag/src/main.py`)

**Added**: Input sanitization across multiple endpoints

- `/search` endpoint sanitizes query text
- `/query` endpoint sanitizes query text and context IDs
- `/cypher` endpoint sanitizes natural language and schema context
- All endpoints include audit logging

### AI Copilot Service (`services/ai-copilot/src/main.py`)

**Added**: Input sanitization to query and RAG endpoints

- `/copilot/query` endpoint sanitizes natural language queries
- `/copilot/rag` endpoint sanitizes question text
- Maintains existing policy checks while adding sanitization
- Includes audit logging for both endpoints
