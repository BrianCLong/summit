import fs from 'fs';
import path from 'path';

const APP_TSX_PATH = path.join(process.cwd(), 'apps/web/src/App.tsx');

function checkResilienceCoverage() {
  console.log(`Checking resilience coverage in ${APP_TSX_PATH}...`);

  if (!fs.existsSync(APP_TSX_PATH)) {
    console.error(`ERROR: App.tsx not found at ${APP_TSX_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(APP_TSX_PATH, 'utf-8');

  // Define critical components that MUST be wrapped
  const criticalComponents = [
    { name: 'InvestigationCanvas', pattern: /<DataFetchErrorBoundary[^>]*>\s*<InvestigationCanvas/s },
    { name: 'MaestroDashboard', pattern: /<DataFetchErrorBoundary[^>]*>\s*<MaestroDashboard/s },
    // TriPanePage is already wrapped, checking to confirm regex works
    { name: 'TriPanePage', pattern: /<DataFetchErrorBoundary[^>]*>\s*<TriPanePage/s },
  ];

  let missingCoverage = false;

  criticalComponents.forEach(comp => {
    // Basic regex check for wrapper.
    // Note: This is a simple static analysis. It assumes the wrapper immediately precedes the component
    // or surrounds it in the JSX structure observable via string matching.
    // Ideally we would use an AST, but for this gate, string matching on the known structure is sufficient.

    // We look for the component usage
    const usageRegex = new RegExp(`<${comp.name}`);
    if (!usageRegex.test(content)) {
      console.warn(`WARNING: Component ${comp.name} not found in App.tsx. Skipping check.`);
      return;
    }

    // We look for the wrapped usage
    // The pattern allows for some whitespace
    const wrapped = comp.pattern.test(content);

    if (!wrapped) {
      console.error(`FAILURE: ${comp.name} is NOT wrapped in DataFetchErrorBoundary.`);
      missingCoverage = true;
    } else {
      console.log(`SUCCESS: ${comp.name} is wrapped.`);
    }
  });

  if (missingCoverage) {
    console.error('\nProject 19 Enforcement Failed: Critical components are missing error boundaries.');
    console.error('Action: Wrap critical routes in <DataFetchErrorBoundary dataSourceName="...">');
    process.exit(1);
  } else {
    console.log('\nProject 19 Enforcement Passed: All critical components are resilient.');
    process.exit(0);
  }
}

checkResilienceCoverage();
