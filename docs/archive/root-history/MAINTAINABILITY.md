# Maintainability Metrics Guide

This document describes the maintainability metrics, thresholds, and tooling configured for the IntelGraph Platform codebase.

## 📋 Table of Contents

1. [Metrics Overview](#metrics-overview)
2. [Thresholds](#thresholds)
3. [Tooling](#tooling)
4. [Running Checks Locally](#running-checks-locally)
5. [CI Integration](#ci-integration)
6. [Weekly Reports](#weekly-reports)
7. [How to Improve Metrics](#how-to-improve-metrics)

---

## 📊 Metrics Overview

We track the following maintainability metrics:

### 1. **Cyclomatic Complexity**
- **What:** Measures the number of independent paths through code
- **Why:** High complexity makes code harder to test and maintain
- **Threshold:** ≤ 15 per function
- **Tool:** ESLint `complexity` rule

### 2. **Cognitive Complexity**
- **What:** Measures how difficult code is to understand (more strict than cyclomatic)
- **Why:** Directly correlates with maintainability
- **Threshold:** ≤ 15 per function
- **Tool:** ESLint `sonarjs/cognitive-complexity`

### 3. **File Size**
- **What:** Total lines of code per file
- **Why:** Large files indicate poor separation of concerns
- **Threshold:** ≤ 500 lines
- **Tool:** ESLint `max-lines`, cloc

### 4. **Function Length**
- **What:** Lines of code per function
- **Why:** Long functions are hard to understand and test
- **Threshold:** ≤ 100 lines
- **Tool:** ESLint `max-lines-per-function`

### 5. **Class Methods**
- **What:** Number of methods in a class
- **Why:** Too many methods indicate "God Object" anti-pattern
- **Threshold:** ≤ 20 methods
- **Tool:** SonarQube

### 6. **Function Parameters**
- **What:** Number of parameters per function
- **Why:** Too many parameters indicate poor abstraction
- **Threshold:** ≤ 5 parameters
- **Tool:** ESLint `max-params`

### 7. **Nesting Depth**
- **What:** Maximum depth of nested blocks/callbacks
- **Why:** Deep nesting reduces readability
- **Threshold:** ≤ 4 levels
- **Tool:** ESLint `max-depth`, `max-nested-callbacks`

### 8. **Code Duplication**
- **What:** Percentage of duplicated code
- **Why:** Duplicated code increases maintenance burden
- **Threshold:** < 5%
- **Tool:** jscpd, SonarQube

### 9. **Import Dependencies**
- **What:** Number of imports per file
- **Why:** Too many imports indicate tight coupling
- **Threshold:** ≤ 20 imports
- **Tool:** ESLint `import/max-dependencies`

### 10. **Technical Debt**
- **What:** Number of TODO/FIXME/HACK comments
- **Why:** Indicates incomplete or problematic code
- **Threshold:** Trend should be decreasing
- **Tool:** Grep analysis, SonarQube

---

## 🎯 Thresholds

| Metric | Warning | Error | Current Baseline |
|--------|---------|-------|------------------|
| Cyclomatic Complexity (function) | > 10 | > 15 | Files with 110 conditions found |
| Cognitive Complexity | > 12 | > 15 | - |
| File Lines | > 500 | > 1000 | 71 files > 1000 lines |
| Function Lines | > 80 | > 100 | Functions with 200+ lines found |
| Class Methods | > 15 | > 20 | Classes with 117 methods found |
| Function Parameters | > 4 | > 5 | - |
| Nesting Depth | > 3 | > 4 | - |
| Code Duplication | > 3% | > 5% | TBD (need jscpd) |
| Imports per File | > 15 | > 20 | Files with 33 imports found |
| Switch Cases | > 8 | > 10 | Switches with 32 cases found |

### Status Indicators

- ✅ **Good** - Within thresholds
- ⚠️ **Warning** - Approaching threshold, needs attention
- ❌ **Critical** - Exceeds threshold, immediate action needed

---

## 🛠️ Tooling

### ESLint Complexity Rules

Configuration file: `.eslintrc.complexity.cjs`

**Plugins:**
- `eslint-plugin-complexity` - Basic complexity metrics
- `eslint-plugin-sonarjs` - Advanced code quality rules
- `eslint-plugin-import` - Import dependency analysis

**Key Rules:**
```javascript
{
  "complexity": ["error", { "max": 15 }],
  "max-lines-per-function": ["warn", { "max": 100 }],
  "max-lines": ["warn", { "max": 500 }],
  "max-depth": ["error", { "max": 4 }],
  "max-params": ["warn", { "max": 5 }],
  "sonarjs/cognitive-complexity": ["error", 15],
  "import/max-dependencies": ["warn", { "max": 20 }]
}
```

### SonarQube Integration

Configuration file: `sonar-project.properties`

**Features:**
- Comprehensive code quality analysis
- Security vulnerability detection
- Code coverage tracking
- Technical debt calculation
- Trend analysis over time

**Key Metrics:**
- Maintainability Rating (A-E)
- Reliability Rating (A-E)
- Security Rating (A-E)
- Duplication percentage
- Test coverage percentage

### Code Metrics Tools

**cloc** - Lines of Code counter
```bash
npm install -g cloc
cloc server/src client/src --exclude-dir=node_modules,dist
```

**jscpd** - Copy/Paste Detector
```bash
npm install -g jscpd
jscpd server/src client/src --min-lines 10
```

---

## 🚀 Running Checks Locally

### Install Required Tools

```bash
# Install global tools (optional, but recommended)
npm install -g cloc jscpd

# Install project dependencies
pnpm install

# Install ESLint complexity plugins
pnpm add -D eslint-plugin-complexity eslint-plugin-sonarjs
```

### Run ESLint Complexity Check

```bash
# Check all files
pnpm exec eslint --config .eslintrc.complexity.cjs "server/src/**/*.{js,ts}" "client/src/**/*.{js,jsx,ts,tsx}"

# Check specific directory
pnpm exec eslint --config .eslintrc.complexity.cjs "server/src/services/**/*.js"

# Auto-fix where possible
pnpm exec eslint --config .eslintrc.complexity.cjs --fix "server/src/**/*.{js,ts}"
```

### Generate Maintainability Report

```bash
# Generate markdown report
node scripts/maintainability-report.js

# Generate report with JSON data
node scripts/maintainability-report.js --json

# Custom output location
node scripts/maintainability-report.js --output=reports/my-report.md
```

### Run Code Duplication Analysis

```bash
# Basic analysis
jscpd server/src client/src

# With HTML report
jscpd server/src client/src --reporters html,console --output ./jscpd-report
```

### Run Lines of Code Analysis

```bash
cloc server/src client/src apps packages services \
  --exclude-dir=node_modules,dist,build,coverage,.turbo
```

---

## 🔄 CI Integration

### GitHub Actions Workflow

File: `.github/workflows/maintainability-check.yml`

**Triggers:**
- Pull requests to `main`
- Pushes to `main`
- Weekly schedule (Sundays at 2 AM UTC)
- Manual workflow dispatch

**Jobs:**

1. **eslint-complexity** - Runs ESLint with complexity rules
   - Outputs: `eslint-report.json`, `complexity-report.md`
   - Duration: ~5 minutes

2. **code-metrics** - Analyzes code metrics
   - Runs: cloc, jscpd, file size analysis, TODO counting
   - Outputs: `metrics-report.md`, `cloc-report.json`, duplication report
   - Duration: ~3 minutes

3. **sonarqube** - Full SonarQube analysis
   - Runs: Only on main branch or when configured
   - Requires: `SONAR_TOKEN` secret
   - Outputs: SonarQube dashboard results
   - Duration: ~10 minutes

4. **weekly-report** - Generates trend report
   - Runs: On schedule or manual trigger
   - Creates GitHub issue with report
   - Duration: ~2 minutes

### Viewing Results

**In Pull Requests:**
1. Go to the PR "Checks" tab
2. Find "Maintainability Metrics Check"
3. View individual job logs
4. Download artifacts for detailed reports

**Artifacts Available:**
- `eslint-complexity-report` - ESLint JSON + markdown
- `code-metrics-report` - Metrics analysis + duplication data
- `weekly-maintainability-report` - Comprehensive trend report

---

## 📈 Weekly Reports

### Automated Weekly Analysis

Every Sunday at 2 AM UTC, the CI system:
1. Runs full maintainability analysis
2. Generates comprehensive report
3. Creates GitHub issue with findings
4. Archives report for 90 days

### Report Contents

```markdown
# Maintainability Trend Report

## Executive Summary
- Overall code quality status
- Key metrics comparison
- Trend direction (improving/degrading)

## Metrics Summary
- File size distribution
- Complexity analysis
- Technical debt tracking
- Code duplication percentage
- Lines of code by language

## Recommendations
- Priority 1: Critical issues
- Priority 2: High impact improvements
- Priority 3: Medium impact improvements

## Historical Trends
- Week-over-week comparison
- Monthly trend graphs (when available)
```

### Viewing Historical Reports

```bash
# GitHub CLI
gh run list --workflow=maintainability-check.yml --limit 10

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

---

## 🎯 How to Improve Metrics

### Reducing File Size

**Problem:** Files over 500 lines

**Solutions:**
1. **Extract Utilities** - Move helper functions to separate files
2. **Split by Responsibility** - Separate concerns into modules
3. **Component Composition** - Break large React components into smaller ones
4. **Service Layer Split** - Divide monolithic services by domain

**Example:**
```javascript
// Before: VisualizationService.js (2,031 lines)
// After:
// - VisualizationService.js (core logic, 300 lines)
// - visualization/themes.js (theme definitions, 200 lines)
// - visualization/renderers.js (rendering logic, 250 lines)
// - visualization/transformers.js (data transformations, 200 lines)
```

### Reducing Complexity

**Problem:** Functions with cyclomatic complexity > 15

**Solutions:**
1. **Extract Methods** - Break down long functions
2. **Early Returns** - Reduce nesting with guard clauses
3. **Strategy Pattern** - Replace large switch statements
4. **Lookup Tables** - Use objects/maps instead of conditionals

**Example:**
```javascript
// Before: High complexity (20)
function processData(data, type) {
  if (type === 'A') {
    if (data.status === 'active') {
      // complex logic
    } else if (data.status === 'pending') {
      // complex logic
    }
  } else if (type === 'B') {
    // more complex logic
  }
  // ... many more conditions
}

// After: Low complexity (3)
const processors = {
  A: processTypeA,
  B: processTypeB,
  // ...
};

function processData(data, type) {
  const processor = processors[type];
  if (!processor) throw new Error(`Unknown type: ${type}`);
  return processor(data);
}
```

### Reducing Duplication

**Problem:** Code duplication > 5%

**Solutions:**
1. **Extract Common Functions** - Create shared utilities
2. **Create Base Classes** - Use inheritance for common behavior
3. **Composition** - Use higher-order functions/components
4. **Configuration** - Replace similar code with config-driven logic

**Example:**
```javascript
// Before: Duplicated validation logic
function validateUser(user) {
  if (!user.name) throw new Error('Name required');
  if (!user.email) throw new Error('Email required');
  // ...
}

function validateProduct(product) {
  if (!product.name) throw new Error('Name required');
  if (!product.price) throw new Error('Price required');
  // ...
}

// After: Shared validation utility
const validate = (obj, schema) => {
  schema.forEach(({ field, required, message }) => {
    if (required && !obj[field]) throw new Error(message);
  });
};

validate(user, userSchema);
validate(product, productSchema);
```

### Reducing Technical Debt

**Problem:** Many TODO/FIXME comments

**Solutions:**
1. **Create Issues** - Convert TODOs to tracked GitHub issues
2. **Implement or Remove** - Don't leave TODOs indefinitely
3. **Document Decisions** - Replace TODOs with ADRs (Architecture Decision Records)
4. **Scheduled Cleanup** - Dedicate time each sprint to address debt

**Best Practices:**
```javascript
// Bad: Vague TODO
// TODO: fix this

// Good: Specific TODO with issue reference
// TODO(#1234): Implement proper error handling for network failures
// Temporarily returning null, but should retry with exponential backoff

// Better: Create issue, remove TODO
// See issue #1234 for planned improvements to error handling
```

### Refactoring God Objects

**Problem:** Classes with 50+ methods

**Solutions:**
1. **Single Responsibility** - Split by domain/feature
2. **Composition over Inheritance** - Break into collaborating objects
3. **Facade Pattern** - Keep interface, delegate to smaller services
4. **Module Organization** - Organize related functionality

**Example:**
```javascript
// Before: ReportingService (117 methods)
class ReportingService {
  generatePDFReport() {}
  generateCSVReport() {}
  generateExcelReport() {}
  sendEmailReport() {}
  scheduleReport() {}
  // ... 112 more methods
}

// After: Split by responsibility
class ReportGenerator {
  generate(format) {}
}

class ReportExporter {
  toPDF() {}
  toCSV() {}
  toExcel() {}
}

class ReportDelivery {
  sendEmail() {}
  schedule() {}
}

class ReportingService {
  constructor() {
    this.generator = new ReportGenerator();
    this.exporter = new ReportExporter();
    this.delivery = new ReportDelivery();
  }

  // Facade methods delegate to specialized services
}
```

---

## 📚 Resources

### Documentation

- [ESLint Rules](https://eslint.org/docs/rules/)
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [Cyclomatic Complexity Explained](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [Cognitive Complexity White Paper](https://www.sonarsource.com/resources/cognitive-complexity/)

### Tools

- [ESLint](https://eslint.org/)
- [SonarQube](https://www.sonarqube.org/)
- [cloc](https://github.com/AlDanial/cloc)
- [jscpd](https://github.com/kucherenko/jscpd)

### Best Practices

- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Refactoring by Martin Fowler](https://refactoring.com/)
- [Code Complete by Steve McConnell](https://www.amazon.com/Code-Complete-Practical-Handbook-Construction/dp/0735619670)

---

## 🔧 Troubleshooting

### ESLint Not Finding Complexity Rules

**Problem:** `Definition for rule 'complexity' was not found`

**Solution:**
```bash
pnpm add -D eslint-plugin-complexity eslint-plugin-sonarjs
```

### SonarQube Analysis Fails

**Problem:** `SONAR_TOKEN` not configured

**Solution:**
1. Create account at [SonarCloud.io](https://sonarcloud.io)
2. Generate token in User Settings
3. Add as repository secret: `SONAR_TOKEN`
4. Configure `SONAR_HOST_URL` variable

### cloc/jscpd Not Found

**Problem:** Command not found errors

**Solution:**
```bash
# Install globally
npm install -g cloc jscpd

# Or use via npx
npx cloc server/src
npx jscpd server/src
```

### Weekly Report Not Creating Issue

**Problem:** GitHub issue not created

**Solution:**
1. Ensure workflow has `issues: write` permission
2. Check if schedule trigger is enabled
3. Verify artifact upload succeeded
4. Check GitHub Actions logs for errors

---

## 📞 Support

For questions or issues with maintainability metrics:

1. Check this documentation
2. Review CI workflow logs
3. Contact the platform team
4. Create an issue in GitHub

---

*Last updated: 2025-11-20*
*Maintained by: IntelGraph Platform Team*
