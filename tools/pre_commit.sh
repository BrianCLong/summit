echo "Running schema tests..."
cd packages/summit-schemas && npx tsx --test src/test/execution.test.ts
