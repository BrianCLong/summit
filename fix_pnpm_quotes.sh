#!/bin/bash
find .github/workflows -type f -name "*.yml" -exec sed -i "/version: '9.12.0'/d" {} +
find .github/workflows -type f -name "*.yml" -exec sed -i '/version: "9.12.0"/d' {} +
find .github/workflows -type f -name "*.yml" -exec sed -i '/version: "10.0.0"/d' {} +
find .github/workflows -type f -name "*.yml.disabled" -exec sed -i '/version: "10.0.0"/d' {} +
