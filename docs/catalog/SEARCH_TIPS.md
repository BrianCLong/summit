# Data Catalog Search Tips

## Basic Search

### Simple Text Search

**Search Across All Fields**
```
customer
```
Searches name, description, tags, and all text fields

**Exact Phrase Match**
```
"customer transactions"
```
Finds exact phrase, not individual words

**Wildcard Search**
```
cust*
```
Matches: customer, customers, custom_data

### Boolean Operators

**AND (implicit)**
```
customer sales
```
Both terms must be present (AND is default)

**OR**
```
customer OR client
```
Either term can be present

**NOT**
```
customer NOT archived
```
Exclude results containing "archived"

**Combining Operators**
```
(customer OR client) AND sales NOT test
```

## Faceted Search

### Filter by Type

```
type:TABLE
type:VIEW
type:DASHBOARD
```

### Filter by Status

```
status:ACTIVE
status:DEPRECATED
status:ARCHIVED
```

### Filter by Domain

```
domain:sales
domain:marketing
domain:finance
```

### Filter by Owner

```
owner:data-team@company.com
owner:john.doe
```

### Filter by Classification

```
classification:PUBLIC
classification:CONFIDENTIAL
classification:RESTRICTED
```

### Combine Multiple Filters

```
type:TABLE AND domain:sales AND status:ACTIVE
```

## Advanced Search

### Field-Specific Search

**Search in Name Only**
```
name:customer
```

**Search in Description**
```
description:"contains transaction data"
```

**Search in Tags**
```
tags:verified
tags:(pii OR sensitive)
```

### Date Range Filters

**Updated Recently**
```
updatedAt:>2024-01-01
```

**Created in Range**
```
createdAt:>=2024-01-01 AND createdAt:<=2024-03-31
```

**Last Accessed**
```
lastAccessedAt:>2024-01-01
```

### Numeric Filters

**Rating Above Threshold**
```
rating:>4.0
```

**Usage Count**
```
usageCount:>1000
```

**Quality Score**
```
qualityScore:>0.85
```

### Certification Level

```
certification:GOLD
certification:(GOLD OR PLATINUM)
```

## Search Ranking

### Boost Important Fields

Search automatically prioritizes:
1. **Exact name matches** (highest priority)
2. **Name contains query** (high priority)
3. **Display name matches** (medium-high)
4. **Tag matches** (medium)
5. **Description mentions** (lower)

### Relevance Signals

Results ranked by:
- **Text relevance**: How well query matches content
- **Popularity**: Endorsements and ratings
- **Quality score**: Data quality metrics
- **Recency**: Recently updated assets ranked higher
- **Usage**: Frequently accessed assets boosted

### Certification Boost

Certified assets receive ranking boost:
- Platinum: +20%
- Gold: +15%
- Silver: +10%
- Bronze: +5%

## Search Patterns

### Finding Similar Assets

**By Name Pattern**
```
name:customer_*_daily
```
Finds: customer_orders_daily, customer_returns_daily

**By Tag Similarity**
```
tags:customer AND tags:analytics
```

### Discovery Queries

**Recently Added**
```
createdAt:>2024-01-01
ORDER BY createdAt DESC
```

**Most Popular**
```
ORDER BY usageCount DESC
```

**Highly Rated**
```
rating:>4.0
ORDER BY rating DESC
```

**Recently Updated**
```
updatedAt:>2024-01-01
ORDER BY updatedAt DESC
```

### Data Quality Search

**High Quality Assets**
```
certification:(GOLD OR PLATINUM) AND qualityScore:>0.90
```

**Needs Improvement**
```
qualityScore:<0.70 AND status:ACTIVE
```

**Recently Verified**
```
lastVerified:>2024-01-01
```

### Domain-Specific Searches

**Sales Analytics**
```
domain:sales AND tags:analytics AND type:TABLE
```

**Customer Data**
```
tags:customer AND (type:TABLE OR type:VIEW)
```

**Real-time Data**
```
tags:real_time OR tags:streaming
```

## Search Shortcuts

### Quick Filters

Use facets for quick filtering:
1. Run initial search
2. Review facet counts
3. Click facet values to filter
4. Combine multiple facets

### Saved Searches

**Save Frequent Searches**
```
Name: "Active Sales Tables"
Query: domain:sales AND type:TABLE AND status:ACTIVE
```

**Share with Team**
- Save search
- Generate share link
- Add to team dashboard

### Search Suggestions

**Use Auto-complete**
- Start typing
- Review suggestions
- Select suggestion or continue typing

**Query Refinement**
Based on your search, the system suggests:
- Related tags
- Common filters
- Alternative queries

## Search API

### REST API Examples

**Basic Search**
```bash
GET /api/v1/search?q=customer&limit=20
```

**Faceted Search**
```bash
POST /api/v1/search
{
  "query": "sales data",
  "filters": [
    { "field": "type", "operator": "IN", "value": ["TABLE", "VIEW"] },
    { "field": "domain", "operator": "EQUALS", "value": "sales" }
  ],
  "facets": ["type", "status", "owner"],
  "sort": [{ "field": "_score", "direction": "DESC" }],
  "offset": 0,
  "limit": 20
}
```

**Advanced Filters**
```bash
POST /api/v1/search
{
  "query": "customer",
  "filters": [
    {
      "field": "updatedAt",
      "operator": "GREATER_THAN",
      "value": "2024-01-01"
    },
    {
      "field": "qualityScore",
      "operator": "BETWEEN",
      "value": [0.8, 1.0]
    }
  ]
}
```

## Search Analytics

### Track Your Searches

**Popular Searches**
- View most common queries
- Identify content gaps
- Optimize metadata

**Zero-Result Searches**
- Queries with no results
- Indicates missing metadata
- Opportunities for improvement

**Click-Through Rates**
- Which results users click
- Ranking effectiveness
- Relevance tuning

## Tips for Better Results

### Be Specific

```
Bad: data
Good: customer transaction data sales
```

### Use Multiple Terms

```
Better: sales customer daily
Than: sales
```

### Check Filters

If no results:
1. Remove filters one by one
2. Try broader domain
3. Check spelling
4. Use wildcards

### Leverage Tags

Tags improve discoverability:
- Add relevant tags to assets
- Use consistent tag taxonomy
- Search by tags for precision

### Use Quotation Marks

For exact phrases:
```
"customer lifetime value"
```

### Try Synonyms

If no results, try alternatives:
```
customer → client
transaction → order
daily → day
```

## Search Performance

### Optimize Query Performance

**Keep Queries Simple**
- Avoid overly complex boolean logic
- Use filters instead of text search when possible
- Limit result sets appropriately

**Use Pagination**
```
offset=0, limit=20  # First page
offset=20, limit=20 # Second page
```

**Cache Common Searches**
- Popular queries are cached
- Faster response times
- Automatic cache invalidation

### Search Index

**Full-Text Index**
- All text fields indexed
- Automatic stemming and tokenization
- Language-aware search

**Field-Specific Indexes**
- Tags: GIN index for array searches
- Dates: B-tree for range queries
- Classification: Enum index

## Troubleshooting

### No Results Found

1. **Check spelling**
2. **Remove filters**
3. **Try broader terms**
4. **Use wildcards**: `cust*`
5. **Check quotation marks**: Remove if too restrictive

### Too Many Results

1. **Add more search terms**
2. **Use exact phrases**: `"exact match"`
3. **Apply filters**: Type, domain, status
4. **Sort by relevance**

### Unexpected Results

1. **Review search logic**: Check AND/OR
2. **Verify filters**: Ensure correct values
3. **Check field-specific search**: May be too narrow
4. **Review stemming**: "running" matches "run"

### Slow Searches

1. **Simplify query**: Remove complex logic
2. **Reduce result limit**
3. **Use specific filters**: Narrow scope
4. **Avoid leading wildcards**: `*customer` is slow

## Intelligence Operations Searches

### Entity Search

**Find Related Entities**
```
tags:entity_person AND name:john*
```

**Cross-Reference Search**
```
tags:investigation_alpha AND type:TABLE
```

### Classification Searches

**Sensitive Data Discovery**
```
classification:CONFIDENTIAL OR classification:RESTRICTED
tags:pii
```

**Cleared for Sharing**
```
classification:PUBLIC OR classification:INTERNAL
```

### Investigation Tracking

**Active Investigations**
```
tags:investigation AND tags:active
```

**Historical Cases**
```
tags:investigation AND createdAt:<2024-01-01
```

## Best Practices

1. **Start broad, then narrow**: Begin with general terms, add filters
2. **Use facets**: Quick way to explore and filter
3. **Save common searches**: Don't repeat complex queries
4. **Check suggestions**: System learns from usage patterns
5. **Provide feedback**: Click tracking improves relevance
6. **Tag assets properly**: Better tags = better search
7. **Document assets well**: Rich metadata = more discoverable
8. **Review search analytics**: Learn what works
9. **Share successful searches**: Help your team
10. **Report issues**: Help improve the catalog
