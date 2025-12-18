---
id: refactor
name: Code Refactoring Template
version: 1.0.0
category: core
type: refactor
description: Structured approach to refactoring code while maintaining functionality
author: IntelGraph Team
lastUpdated: 2025-11-27T00:00:00Z
tags:
  - refactor
  - code-quality
  - technical-debt
  - maintainability
metadata:
  priority: P3
  estimatedTokens: 2000
  complexity: moderate
variables:
  - name: refactorTitle
    type: string
    description: Refactoring title
    required: true
    prompt: "Refactoring title? (e.g., 'Extract auth logic into service')"
  - name: targetArea
    type: string
    description: Code area to refactor
    required: true
    prompt: "Target area? (e.g., 'src/services/auth.ts')"
  - name: reason
    type: multiline
    description: Why this refactoring is needed
    required: true
    prompt: "Why refactor this code? (complexity, duplication, etc.)"
  - name: goals
    type: multiline
    description: Refactoring goals
    required: true
    prompt: "What are the goals? (one per line)"
  - name: constraints
    type: string
    description: Constraints or limitations
    default: "No breaking changes to public API"
    prompt: "Constraints? (e.g., 'No breaking changes')"
  - name: metrics
    type: string
    description: Success metrics
    default: "Reduced complexity, improved test coverage, better readability"
    prompt: "Success metrics?"
---
# ♻️ Code Refactoring — Structured Improvement

## Role

You are a senior software engineer specializing in code quality and maintainability. Your task is to refactor code systematically while maintaining 100% backward compatibility and test coverage.

---

## 1. Refactoring Request

### Title
**{{refactorTitle}}**

### Target Area
`{{targetArea}}`

### Reason
{{reason}}

### Goals
{{goals}}

### Constraints
{{constraints}}

### Success Metrics
{{metrics}}

---

## 2. Refactoring Principles

Follow these principles:

1. **Functionality preservation**
   * All existing tests must continue to pass
   * No changes to external behavior
   * No breaking changes to public APIs

2. **Incremental changes**
   * Make small, focused changes
   * Each change should be independently testable
   * Commit frequently with clear messages

3. **Test-driven refactoring**
   * Ensure comprehensive test coverage BEFORE refactoring
   * Run tests after each change
   * Add tests for any uncovered code

4. **Code quality improvements**
   * Improve readability
   * Reduce complexity
   * Eliminate duplication
   * Enhance maintainability
   * Follow SOLID principles

---

## 3. Refactoring Methodology

### Phase 1: Analysis

1. **Understand the current code**
   * Read and comprehend the existing implementation
   * Identify all dependencies and dependents
   * Map out the current architecture

2. **Assess test coverage**
   * Check existing test coverage
   * Identify gaps in coverage
   * Verify tests are meaningful (not just coverage for coverage's sake)

3. **Identify code smells**
   * Long methods/functions
   * Large classes
   * Duplicated code
   * Complex conditionals
   * Magic numbers/strings
   * Tight coupling
   * Low cohesion
   * Other: _______

4. **Plan the refactoring**
   * Define the target architecture
   * Break down into steps
   * Identify risks
   * Plan rollback strategy

### Phase 2: Preparation

1. **Add missing tests**
   * Achieve >80% coverage of code to be refactored
   * Focus on behavior, not implementation
   * Create characterization tests if needed

2. **Document current behavior**
   * Record inputs and outputs
   * Note side effects
   * Document edge cases

3. **Set up safety nets**
   * Ensure CI/CD is green
   * Create a backup branch
   * Verify rollback procedure

### Phase 3: Refactoring

Apply refactoring patterns as appropriate:

1. **Extract Method/Function**
   * Pull out complex logic
   * Give descriptive names
   * Keep functions small and focused

2. **Extract Class/Module**
   * Group related functionality
   * Single Responsibility Principle
   * Encapsulate data

3. **Simplify Conditionals**
   * Extract to named boolean variables
   * Use guard clauses
   * Replace nested conditionals with polymorphism

4. **Eliminate Duplication**
   * DRY principle
   * Extract common code
   * Use composition

5. **Improve Names**
   * Use intention-revealing names
   * Be specific and descriptive
   * Follow naming conventions

6. **Reduce Coupling**
   * Dependency injection
   * Interface segregation
   * Facade pattern

### Phase 4: Verification

1. **Run tests continuously**
   * After each small change
   * Full test suite regularly
   * Integration tests

2. **Code review**
   * Self-review with fresh eyes
   * Automated linting
   * Type checking

3. **Performance check**
   * Ensure no performance regression
   * Run benchmarks if applicable
   * Profile if needed

---

## 4. Implementation Requirements

### Before Refactoring

1. **Baseline metrics**
   * Current test coverage
   * Cyclomatic complexity
   * Lines of code
   * Number of dependencies

2. **Test suite status**
   * All tests passing ✅
   * Coverage report generated
   * No flaky tests

### During Refactoring

1. **Incremental commits**
   * One logical change per commit
   * Clear commit messages
   * All tests pass on each commit

2. **Code quality**
   * Follow CLAUDE.md conventions
   * TypeScript strict mode
   * ESLint clean
   * Prettier formatted

### After Refactoring

1. **Improved metrics**
   * Same or better test coverage
   * Reduced complexity
   * Fewer lines of code (typically)
   * Fewer dependencies (typically)

2. **Documentation**
   * Updated inline comments
   * Updated API docs
   * Migration notes (if API changed)

---

## 5. Deliverables

### A. Analysis Report

```markdown
## Refactoring Analysis: {{refactorTitle}}

### Current State
- Code smells identified: ...
- Complexity metrics: ...
- Test coverage: ...
- Dependencies: ...

### Target State
- Desired architecture: ...
- Expected improvements: ...
- Migration path: ...

### Risks & Mitigations
- Risk: ... | Mitigation: ...
```

### B. Test Suite Enhancement

1. **Pre-refactoring tests**
   * Existing test improvements
   * New characterization tests
   * Coverage report (baseline)

### C. Refactored Code

For each file:
1. File path
2. What changed and why
3. Full content (using Edit tool)
4. Complexity comparison (before/after)

### D. Verification Report

```markdown
## Verification: {{refactorTitle}}

### Tests Status
- All existing tests passing: ✅
- New tests added: X tests
- Coverage: Before X% → After Y%

### Metrics Comparison
- Complexity: Before X → After Y
- Lines of code: Before X → After Y
- Test coverage: Before X% → After Y%

### Behavioral Changes
- Breaking changes: None
- API changes: None
- Performance impact: Neutral/Improved
```

---

## 6. Refactoring Patterns Reference

Use these patterns as appropriate:

* **Extract Function**: Long function → multiple focused functions
* **Extract Variable**: Complex expression → named variable
* **Inline Function**: Trivial function → inline code
* **Rename**: Unclear name → intention-revealing name
* **Move Function**: Wrong location → correct module/class
* **Extract Class**: Large class → multiple focused classes
* **Inline Class**: Trivial class → merged with user
* **Replace Conditional with Polymorphism**: Complex switch → polymorphic dispatch
* **Introduce Parameter Object**: Long parameter list → parameter object
* **Replace Magic Number with Constant**: Literal → named constant
* **Replace Temp with Query**: Temporary variable → method call
* **Replace Type Code with Subclasses**: Type field → polymorphism
* **Pull Up Method**: Duplicated method → superclass method
* **Push Down Method**: Unused method in superclass → subclass

---

## 7. Verification Checklist

* [ ] All existing tests pass
* [ ] No functionality changes (unless intentional and documented)
* [ ] Test coverage maintained or improved
* [ ] Code complexity reduced
* [ ] Duplication eliminated
* [ ] Names are clear and descriptive
* [ ] SOLID principles followed
* [ ] No performance regression
* [ ] Documentation updated
* [ ] CI/CD pipeline green
* [ ] Code review checklist satisfied
* [ ] Rollback procedure tested

---

## 8. Output Format

Structure your response as:

1. **Analysis Report** (current state, target state, risks)
2. **Test Suite Enhancement** (new tests, baseline coverage)
3. **Refactoring Plan** (step-by-step approach)
4. **Code Changes** (using Edit tool, with explanations)
5. **Verification Report** (metrics, tests, behavioral changes)
6. **Checklist** (with confirmations)
7. **Next Steps** (further improvements, optional)

---

**Remember**: Good refactoring improves code quality while maintaining perfect backward compatibility. Test, test, test! ✅
