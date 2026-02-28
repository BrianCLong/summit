#!/bin/bash
# 1. Fix missing Express Core typings
pnpm add -w -D @types/express-serve-static-core
pnpm --filter intelgraph-server add -D @types/express-serve-static-core
cd server
npm i -D @types/express-serve-static-core
cd ..

# 2. Fix the curl issue writing output to directory `opa`
sed -i 's/curl -L -o opa /curl -L -o opa_bin /g' .github/workflows/integrity.yml
sed -i 's/chmod +x opa/chmod +x opa_bin/g' .github/workflows/integrity.yml
sed -i 's/\.\/opa eval/\.\/opa_bin eval/g' .github/workflows/integrity.yml
