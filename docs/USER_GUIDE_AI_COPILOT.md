# AI Copilot User Guide for Intelligence Analysts

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Natural Language Queries](#natural-language-queries)
4. [Understanding Query Previews](#understanding-query-previews)
5. [Executing Queries](#executing-queries)
6. [Working with Results](#working-with-results)
7. [Generating Hypotheses](#generating-hypotheses)
8. [Building Narratives](#building-narratives)
9. [Query Templates](#query-templates)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

The AI Copilot is your intelligent assistant for investigating complex networks and relationships. It allows you to:

- **Ask questions in plain English** instead of writing complex database queries
- **Preview queries before running them** to understand cost and impact
- **Get AI-generated hypotheses** about your investigation
- **Build comprehensive narratives** automatically from investigation data
- **Navigate results with citations** showing exactly which entities contributed to answers

### Key Features

✅ **Auditable by Design** - Every query is logged with a unique audit ID
✅ **Safe by Default** - Dangerous queries are automatically blocked
✅ **Cost-Aware** - See estimated resource usage before execution
✅ **Explainable** - Plain English explanations of what each query does
✅ **Citable** - Entity citations link results back to source data

---

## Getting Started

### Opening the Copilot

1. Navigate to any investigation detail page
2. Click the **AI Copilot** icon (🤖) in the top-right corner
3. The copilot sidebar will slide open from the right

**Keyboard Shortcut:** `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)

### Copilot Interface Overview

The copilot has three main tabs:

| Tab | Purpose |
|-----|---------|
| **Query** | Ask questions and execute queries |
| **Hypotheses** | Generate AI-powered investigation theories |
| **Narrative** | Build comprehensive analytical reports |

---

## Natural Language Queries

### How to Ask Questions

Simply type your question in plain English:

**Good Examples:**
```
Show me all persons connected to financial entities
Find entities with more than 10 connections
What are the most recent entities added in the last 7 days?
Show me suspicious transactions over $50,000
```

**Tips for Better Results:**
- Be specific about entity types (Person, Organization, Account, etc.)
- Include time ranges when relevant ("in the last 30 days")
- Specify thresholds for filters ("greater than 5", "more than $10,000")
- Use domain terms your investigation uses

### Query Syntax Patterns

| Pattern | Example |
|---------|---------|
| **Simple listing** | "Show me all persons" |
| **Filtered search** | "Find persons with confidence > 0.8" |
| **Relationship query** | "Show persons connected to organizations" |
| **Temporal filter** | "Find entities added last week" |
| **Threshold query** | "Show entities with more than 5 connections" |
| **Attribute search** | "Find offshore accounts" |

---

## Understanding Query Previews

### What You'll See

After entering a query and clicking **Preview Query**, you'll see:

#### 1. **Explanation**
Plain English description of what the query will do.

```
Example:
"This query finds Person entities connected to Financial entities
via any relationship type, limited to 100 results."
```

#### 2. **Cost Metrics**

Three key indicators:

| Metric | Meaning | Good Range |
|--------|---------|------------|
| **Estimated Rows** | Number of results expected | < 500 for quick analysis |
| **Cost Units** | Resource consumption estimate | < 5 units for routine queries |
| **Complexity** | Query difficulty | Low or Medium preferred |

**Complexity Levels:**
- 🟢 **Low** - Simple, fast query (< 0.1 seconds)
- 🟡 **Medium** - Moderate query (0.1-1 seconds)
- 🔴 **High** - Complex query (> 1 second, may be resource-intensive)

#### 3. **Warnings**

Pay attention to warnings:

| Warning | Meaning | Action |
|---------|---------|--------|
| "No LIMIT clause" | Query may return unlimited results | Narrow your search |
| "Variable-length path" | Query explores many connections | Add constraints |
| "Multiple MATCH clauses" | Query has multiple search patterns | Consider splitting |

#### 4. **Generated Cypher Code**

Click **"Show Generated Cypher"** to see the actual database query. This is useful for:
- Learning query syntax
- Verifying the query matches your intent
- Debugging unexpected results

---

## Executing Queries

### When a Query is Allowed

If the preview shows ✅ **"Query Ready for Execution"**:

1. Review the explanation and metrics
2. Check any warnings
3. Click **Execute Query** to run it

**Execution Time:** Most queries complete in < 1 second.

### When a Query is Blocked

If the preview shows ❌ **"Query Blocked"**, you'll see:

- **Clear reason** why the query was blocked
- **Specific policy violations** detected
- **Audit ID** for compliance tracking

**Common Block Reasons:**

| Reason | Why | What to Do |
|--------|-----|------------|
| "DELETE operations not allowed" | Query tries to modify data | Rephrase as a read-only query |
| "Prompt injection detected" | Query contains suspicious patterns | Use simpler, direct language |
| "Query too complex: estimated 15,247 rows" | Query would return too many results | Add filters to narrow scope |
| "Missing investigationId filter" | Query doesn't limit to current investigation | This is a safety bug - report it |

**All blocked queries are logged for security auditing.**

---

## Working with Results

### Results Display

After successful execution, you'll see:

#### Summary Metrics

```
✅ 47 records • 78ms • 12 entities
```

- **Record count** - Number of results returned
- **Execution time** - How long the query took
- **Entity count** - Unique entities in results

#### Entity Citations

The copilot shows **which entities contributed** to the results:

```
Entity Citations:
[person-1547] [person-2891] [account-445] [account-667] ...
```

**Clicking a citation:**
- Navigates to that entity's detail view
- Highlights the entity in the graph visualization
- Shows relationship context

#### Result Records

Each record is displayed in JSON format showing:
- Entity properties (id, type, label, etc.)
- Relationship details
- Confidence scores

### Navigating Results

**Best Practices:**
1. Start with high-level queries to get overview
2. Use citations to drill into interesting entities
3. Refine queries based on initial results
4. Save successful queries for reuse

---

## Generating Hypotheses

### What Are Hypotheses?

The AI analyzes your investigation data and generates **plausible theories** that explain observed patterns.

### How to Generate

1. Switch to the **Hypotheses** tab
2. Click **Generate Hypotheses**
3. Wait 5-10 seconds for AI processing

### What You Get

Each hypothesis includes:

#### **Statement**
```
"John Doe may be coordinating offshore transfers for multiple clients"
```

#### **Confidence Score**
```
82% confidence
```

Interpretation:
- > 80%: Strong evidence supports this hypothesis
- 60-80%: Moderate support, worth investigating
- < 60%: Weak support, speculative

#### **Supporting Evidence**
```
Evidence:
• Pattern of 12 transfers in 2-day windows (Pattern, strength: 0.85)
• Common recipients across transactions (Relationship, strength: 0.78)
```

#### **Suggested Next Steps**
```
Next Steps:
1. Investigate common recipients
2. Check for encrypted communications
3. Cross-reference with known shell companies
```

### Using Hypotheses

**Workflow:**
1. Generate hypotheses early in investigation
2. Prioritize high-confidence hypotheses
3. Use suggested steps as investigation roadmap
4. Validate or refute each hypothesis with queries
5. Save validated hypotheses to case file

---

## Building Narratives

### What Are Narratives?

AI-generated analytical reports that synthesize your investigation into a coherent story.

### Narrative Styles

| Style | Best For | Format |
|-------|----------|--------|
| **Analytical** | Formal intelligence reports | Findings + Recommendations |
| **Chronological** | Timeline-based cases | Events in sequence |
| **Network-Focused** | Relationship-heavy cases | Entity connections |
| **Threat Assessment** | Risk evaluation | Threats + Mitigation |

### How to Generate

1. Switch to the **Narrative** tab
2. (Optional) Select a style - defaults to Analytical
3. Click **Generate Narrative**
4. Wait 10-20 seconds for AI writing

### What You Get

#### Title
```
"Financial Network Analysis: Operation Windfall"
```

#### Content
Markdown-formatted report (500-800 words) with:
- Executive summary
- Key findings
- Entity relationships
- Risk assessment
- Recommendations

#### Key Findings
```
Key Findings:
• 47 entities involved in suspicious financial activity
• Central hub: John Doe controls 85% of transaction flow
• Activity spike detected in last 30 days
```

#### Citations
Entity IDs referenced in the narrative, linked to source data.

#### Confidence Score
```
85% confidence
```

Overall confidence in narrative accuracy based on data quality.

### Using Narratives

**Workflow:**
1. Generate draft narrative mid-investigation
2. Review for accuracy and completeness
3. Edit and refine as needed
4. Save to case file
5. Export for reporting

---

## Query Templates

### What Are Templates?

Pre-built queries for common investigation patterns. Templates save time and ensure consistent analysis.

### Using Templates

1. Click the **Templates** button (if available)
2. Browse by category:
   - Entity Discovery
   - Relationships
   - Financial
   - Temporal
   - Suspicious Activity
   - Network Analysis
   - Geographic
   - Data Quality

3. Select a template
4. Fill in any required variables
5. Click **Apply** to populate query

### Popular Templates

| Template | Query |
|----------|-------|
| **High Confidence Entities** | "Show me all {{entityType}} entities with confidence greater than {{threshold}}" |
| **Connected Entities** | "Show me all {{sourceType}} entities connected to {{targetType}} entities" |
| **Financial Transfers** | "Show me all persons who transferred money to {{accountType}} accounts" |
| **Recent Activity** | "Show me all entities active in the last {{days}} days" |
| **Central Entities** | "What are the most central entities in this investigation" |

### Creating Custom Templates

(Feature available to admin users)

1. Navigate to Settings > Copilot Templates
2. Click **New Template**
3. Define template with {{variables}}
4. Save and share with team

---

## Best Practices

### Query Crafting

✅ **Do:**
- Start broad, then narrow with filters
- Use specific entity types
- Include time ranges when relevant
- Check preview before executing
- Save successful queries

❌ **Don't:**
- Use vague terms like "stuff" or "things"
- Request all data without filters
- Ignore warnings in preview
- Execute high-cost queries unnecessarily

### Investigation Workflow

**Recommended Flow:**

1. **Explore** - Start with broad discovery queries
2. **Focus** - Use citations to identify key entities
3. **Analyze** - Generate hypotheses
4. **Validate** - Run targeted queries to test hypotheses
5. **Document** - Build narrative report
6. **Review** - Verify citations and audit trail

### Performance Tips

- **Limit result sizes** - Use filters to keep results < 500 rows
- **Cache repeated queries** - The copilot caches common queries automatically
- **Use templates** - Pre-optimized queries run faster
- **Split complex questions** - Break into multiple simpler queries

### Security & Compliance

- **Every query is audited** - Audit IDs track all activity
- **Blocked queries are logged** - Security team reviews suspicious attempts
- **Citations ensure provenance** - All results traceable to source entities
- **PII is automatically detected** - Sensitive data is flagged/redacted

---

## Troubleshooting

### Common Issues

#### "Query generation taking too long"

**Cause:** LLM service latency or complex query parsing

**Solutions:**
- Simplify your question
- Check internet connection
- Try again in a few moments
- Contact support if persists > 30 seconds

#### "Many of my queries are blocked"

**Cause:** Queries may be triggering false positives or violating actual policies

**Solutions:**
- Review block reasons in preview
- Rephrase using simpler language
- Avoid words like "delete", "remove", "destroy"
- Contact admin if legitimate queries are blocked

#### "Citations not showing entities"

**Cause:** Query didn't return entity objects, or entities missing IDs

**Solutions:**
- Ensure query returns entities (not just counts/aggregates)
- Verify entities have valid IDs
- Try a different query pattern

#### "Cypher syntax errors"

**Cause:** LLM generated invalid query syntax

**Solutions:**
- Rephrase question more clearly
- Use a template as starting point
- Report the issue with your original query

---

## Support

### Getting Help

- **Documentation:** [https://docs.summit.com/copilot](https://docs.summit.com/copilot)
- **Support Ticket:** Use "Help" menu in app
- **Training:** Contact your team lead for copilot training sessions

### Providing Feedback

Help us improve the copilot:

1. Click **Feedback** button in copilot
2. Rate query quality (1-5 stars)
3. Describe what went wrong or could be better
4. Submit anonymously or with contact info

### Reporting Bugs

If you encounter a bug:

1. Note the **Audit ID** from the error message
2. Take a screenshot
3. File a support ticket with:
   - Audit ID
   - Query you entered
   - Expected vs actual behavior
   - Screenshot

---

## Appendix: Query Examples by Use Case

### Fraud Investigation

```
Find persons with multiple offshore accounts
Show financial entities flagged as suspicious
What are the largest transactions in the last 30 days?
Find entities with conflicting address information
```

### Network Analysis

```
What are the most connected entities?
Show me all entities within 2 hops of John Doe
Find entities that share common connections
What are the central hubs in this network?
```

### Timeline Investigation

```
Show me all events in chronological order
Find entities added between January and March 2024
What activity occurred on March 15, 2024?
Show me recent changes to entity relationships
```

### Data Quality

```
Find entities with low confidence scores
Show me incomplete entity records
What entities have missing critical fields?
Find potential duplicate entities
```

---

## Version History

- **v1.0** (2025-11-20) - Initial MVP release
  - Natural language queries
  - Query preview with cost estimation
  - Hypothesis generation
  - Narrative building
  - Query templates

---

**Questions?** Contact the Intelligence Systems Team at [intel-systems@summit.com](mailto:intel-systems@summit.com)
