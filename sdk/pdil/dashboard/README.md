# PDIL Dashboard Utilities

This package contains a lightweight TypeScript toolkit that converts PDIL replay
reports into an HTML dashboard. The dashboard ranks risky prompt diffs by
business impact and highlights regressions that should be triaged.

## Usage

```
npm install
npm run build
node dist/index.js --input ../../pdil-report.json --output ../../pdil-dashboard.html
```

During development you can run the script with `ts-node` instead of compiling:

```
npx ts-node src/index.ts --input ../../pdil-report.json
```

The generated HTML includes:

- Coverage delta summary and aggregate risk score.
- Table of cases sorted by risk contributions, including severity, taxonomy and
  business impact.
- Regression badges and tag annotations to help reviewers filter high priority
  failures.
