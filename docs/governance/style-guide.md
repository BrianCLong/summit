---
title: Documentation Style Guide
summary: Comprehensive style guide for consistent, high-quality documentation across the IntelGraph ecosystem
version: 2.0.0
lastUpdated: 2025-09-09
owner: docs
status: approved
reviewers: [docs-team, editorial-board]
---

# IntelGraph Documentation Style Guide

## Writing Principles

### Voice and Tone

- **Professional yet approachable**: Maintain expertise while being welcoming
- **Clear and concise**: Eliminate ambiguity and unnecessary complexity
- **Action-oriented**: Focus on what users need to do
- **Inclusive**: Use inclusive language that welcomes all users

### Core Values

1. **User-first**: Always prioritize user needs and understanding
2. **Accuracy**: Technical precision without compromise
3. **Accessibility**: Content accessible to all users and skill levels
4. **Consistency**: Uniform experience across all documentation

## Language Guidelines

### General Writing Rules

#### Sentence Structure

- Use active voice: "Run the command" not "The command should be run"
- Keep sentences under 25 words when possible
- Use parallel structure in lists and series
- Place conditional clauses at the beginning: "If you need to..., then..."

#### Word Choice

- Use simple, common words over complex alternatives
- Choose specific verbs over generic ones
- Avoid unnecessary adverbs and adjectives
- Use contractions sparingly and only when appropriate

#### Terminology Standards

##### IntelGraph-Specific Terms

- **IntelGraph** (not Intel Graph, intel-graph, or intelgraph)
- **GraphRAG** (not Graph RAG, graph-rag, or graphrag)
- **Maestro Orchestrator** (not maestro orchestrator or Maestro-orchestrator)
- **ZIP Export** (not zip export or Zip Export)

##### Technical Terms

- **API endpoint** (not API Endpoint or api endpoint)
- **JSON** (not Json or json)
- **HTTP status code** (not HTTP Status Code)
- **OAuth 2.0** (not OAuth2 or oAuth)
- **webhook** (not web hook or WebHook)

##### Action Verbs

- **Choose** (not select, unless referring to UI selection)
- **Enter** (not input or type, for text entry)
- **Click** (not press, for buttons and links)
- **Navigate to** (not go to)

### Formatting Conventions

#### Headings

- Use sentence case: "Getting started with APIs"
- Be descriptive and scannable
- Avoid questions as headings unless in FAQ sections
- Use gerunds for task-oriented content: "Installing the SDK"

#### Lists

- Use parallel structure
- Start with action verbs for procedural lists
- Use bullet points for unordered lists
- Use numbers for sequential procedures

##### Example - Good List Structure

1. Install the required dependencies
2. Configure your environment variables
3. Initialize the SDK client
4. Test the connection

#### Code and Technical Elements

##### Code Blocks

```bash
# Use descriptive comments
curl -X POST https://api.intelgraph.com/v1/queries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "your GraphRAG query here"}'
```

##### Inline Code

- Use `backticks` for: commands, file names, API endpoints, parameters
- Use **bold** for: UI elements, button names, field labels
- Use _italics_ for: placeholders, emphasis, new concepts on first use

##### File Paths and URLs

- Use forward slashes for all paths: `docs/api/reference.md`
- Include protocol for external URLs: `https://example.com`
- Use relative paths for internal documentation links

## Content Structure Standards

### Page Structure Template

```markdown
---
title: Descriptive Page Title
summary: One-sentence description of page content and purpose
version: 1.0.0
lastUpdated: YYYY-MM-DD
owner: team-name
tags: [relevant, tags, here]
---

# Page Title

Brief introduction paragraph explaining purpose and scope.

## Prerequisites

List requirements before proceeding.

## Main Content Sections

### Subsection Heading

Content organized logically with clear hierarchy.

## Troubleshooting

Common issues and solutions.

## See also

- [Related Document](link)
- [Another Resource](link)

## Next steps

- What to do after completing this task
- Follow-up resources or procedures
```

### Content Types

#### Tutorial Structure

1. **Overview**: What you'll accomplish
2. **Prerequisites**: What you need before starting
3. **Step-by-step instructions**: Numbered, sequential steps
4. **Validation**: How to verify success
5. **Troubleshooting**: Common issues
6. **Next steps**: What to do next

#### How-to Guide Structure

1. **Goal**: What this guide helps you accomplish
2. **Prerequisites**: Requirements and assumptions
3. **Procedure**: Step-by-step instructions
4. **Validation**: How to confirm success
5. **Related tasks**: Links to related procedures

#### Reference Documentation Structure

1. **Overview**: Brief description of the reference material
2. **Syntax/Usage**: Basic syntax or usage patterns
3. **Parameters/Options**: Detailed parameter descriptions
4. **Examples**: Practical examples with explanations
5. **Error handling**: Common errors and solutions

#### Conceptual Documentation Structure

1. **Introduction**: What is this concept?
2. **Why it matters**: Business or technical value
3. **How it works**: Technical explanation
4. **Use cases**: When and why to use
5. **Best practices**: Recommendations and guidelines
6. **Related concepts**: Connections to other topics

## User Experience Guidelines

### Accessibility Requirements

#### Writing for Accessibility

- Use descriptive headings that work with screen readers
- Provide alt text for all images: `![Alt text describing the image](image.jpg)`
- Use descriptive link text: "Read the installation guide" not "Click here"
- Maintain logical heading hierarchy (h1 → h2 → h3)

#### Color and Visual Elements

- Don't rely solely on color to convey information
- Ensure sufficient contrast ratios (4.5:1 minimum)
- Use icons and symbols with text labels
- Make interactive elements clearly identifiable

### Mobile Optimization

- Use responsive design principles
- Keep tables simple or provide horizontal scroll
- Ensure tap targets are at least 44px
- Test readability on small screens

### Information Architecture

#### Navigation Principles

- Use breadcrumbs for deep content
- Provide multiple paths to important information
- Include search functionality
- Create logical groupings and categories

#### Cross-References

- Link to related content contextually
- Use "See also" sections for additional resources
- Provide "Next steps" guidance
- Create topic clusters for complex subjects

## Quality Assurance Standards

### Content Review Checklist

#### Technical Accuracy

- [ ] All code examples tested and working
- [ ] API responses match current system behavior
- [ ] Screenshots reflect current UI
- [ ] Links functional and up-to-date

#### Style Compliance

- [ ] Follows voice and tone guidelines
- [ ] Uses approved terminology
- [ ] Maintains consistent formatting
- [ ] Adheres to structure templates

#### User Experience

- [ ] Clear and actionable instructions
- [ ] Appropriate for target audience
- [ ] Includes necessary context
- [ ] Provides troubleshooting guidance

#### Accessibility

- [ ] Descriptive headings and alt text
- [ ] Logical content hierarchy
- [ ] Screen reader compatibility
- [ ] Color-blind friendly design

### Automated Quality Checks

#### Linting Rules (Vale Configuration)

```yaml
# Vale style rules
StylesPath: .github/styles
MinAlertLevel: suggestion

Packages:
- Microsoft
- write-good

[*.md]
# Vocabulary and terminology
intelgraph.Terminology = YES
intelgraph.Acronyms = YES

# Style and clarity
Microsoft.Contractions = YES
Microsoft.FirstPerson = YES
Microsoft.Passive = YES
write-good.Weasel = YES
```

#### Link Checking

- Automated daily checks for broken links
- Validation of internal cross-references
- External link status monitoring
- Redirect detection and management

## Localization Guidelines

### Internationalization Preparation

- Write in clear, simple English for translation
- Avoid idioms, colloquialisms, and cultural references
- Use consistent terminology throughout
- Consider text expansion in other languages

### Translation Standards

- Maintain IntelGraph terminology consistently
- Preserve technical accuracy across languages
- Adapt examples for regional relevance
- Test functionality in translated environments

### Cultural Considerations

- Use inclusive examples and scenarios
- Consider different date/time formats
- Account for right-to-left reading languages
- Respect cultural norms and expectations

## Brand and Legal Guidelines

### Brand Voice

- Professional and knowledgeable
- Helpful and solution-focused
- Innovative yet reliable
- Inclusive and accessible

### Legal Compliance

- Include appropriate copyright notices
- Attribute third-party content properly
- Comply with data privacy regulations
- Follow open source licensing requirements

### Trademark Usage

- Use registered trademarks correctly: IntelGraph®
- Include trademark notices where appropriate
- Respect third-party trademark rights
- Follow brand guidelines for logo usage

## Tools and Automation

### Recommended Tools

#### Writing and Editing

- **Grammar**: Grammarly, ProWritingAid
- **Style**: Vale, textlint
- **Accessibility**: WAVE, axe DevTools
- **Screenshots**: Snagit, CloudApp

#### Development

- **Markdown Editors**: Typora, Mark Text, Obsidian
- **Diagramming**: Mermaid, Lucidchart, draw.io
- **Code Formatting**: Prettier, Black (Python), gofmt (Go)

#### Quality Assurance

- **Link Checking**: Lychee, markdown-link-check
- **Performance**: Lighthouse, WebPageTest
- **SEO**: Semrush, Ahrefs, Google Search Console

### Automation Workflows

#### Pre-commit Hooks

```bash
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
  - repo: https://github.com/errata-ai/vale
    hooks:
      - id: vale
```

#### CI/CD Integration

- Automated style checking on pull requests
- Link validation on content changes
- Accessibility scanning for new pages
- Performance monitoring for documentation site

## Maintenance and Updates

### Regular Review Schedule

- **Monthly**: Style guide compliance spot checks
- **Quarterly**: Comprehensive terminology review
- **Annually**: Complete style guide revision
- **As needed**: Updates for new features or tools

### Change Management

1. Propose changes through RFC process
2. Review with editorial board and stakeholders
3. Update style guide and notify teams
4. Provide training on significant changes
5. Monitor compliance and gather feedback

### Feedback Integration

- Collect user feedback on documentation clarity
- Monitor support ticket themes for style issues
- Analyze search queries for terminology gaps
- Incorporate accessibility user testing results

---

## See also

- [Documentation Charter](documentation-charter.md)
- [Content Templates](templates/)
- [Quality Assurance Procedures](quality-assurance.md)

## Next steps

1. Implement automated style checking with Vale
2. Create content templates based on style guide
3. Train team members on style guide requirements
4. Establish regular review and update procedures
