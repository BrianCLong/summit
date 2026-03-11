#!/bin/bash
# Install to a specific temporary folder instead of root package.json
mkdir -p .ajv-temp
cd .ajv-temp
npm init -y
npm install ajv --no-save
cd ..
