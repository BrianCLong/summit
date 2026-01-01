#!/bin/bash
set -e

echo "Running Security Incident Pipeline Tests..."
cd server

echo "1. Security Incident Pipeline..."
npx tsx src/tests/SecurityIncidentPipeline.test.ts

echo "2. Governed Agent Runtime..."
npx tsx src/maestro/__tests__/GovernedRuntime.test.ts

echo "3. Admin Config Validation..."
npx tsx src/tests/config/AdminConfig.test.ts

echo "4. Copilot Policy..."
npx tsx src/tests/CopilotPolicy.test.ts

echo "All Security Gates Passed!"
