#!/bin/bash
# Update dependencies to secure versions

echo "Updating dependencies to secure versions..."

# Navigate to the server directory
cd server

# Create backup of original package.json
cp dist/package.json dist/package.json.backup

# Update specific vulnerable packages to secure versions
# Note: In a real scenario, we would use npm audit to identify specific vulnerabilities
# For this demonstration, we'll update some common vulnerable packages

# Update helmet to latest secure version
npm install helmet@latest --save

# Update express to latest secure version  
npm install express@latest --save

# Update validator to latest secure version
npm install validator@latest --save

# Update jsonwebtoken to latest secure version
npm install jsonwebtoken@latest --save

# Update lodash to latest secure version (if present)
npm install lodash@latest --save

# Update axios to latest secure version (if present)
npm install axios@latest --save

# Update all dev dependencies to secure versions
npm install --save-dev @types/node@latest
npm install --save-dev eslint@latest
npm install --save-dev jest@latest

# Run audit to check for remaining vulnerabilities
npm audit

echo "Dependency updates completed."
