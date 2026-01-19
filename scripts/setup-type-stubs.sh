#!/bin/bash
# Setup type definition stubs for @hapi packages
# These stubs work around TypeScript looking for "hapi__catbox" instead of "@hapi/catbox"

mkdir -p node_modules/@types/hapi__catbox
mkdir -p node_modules/@types/hapi__shot

cat > node_modules/@types/hapi__catbox/index.d.ts << 'EOF'
export * from '@hapi/catbox';
EOF

cat > node_modules/@types/hapi__shot/index.d.ts << 'EOF'
export * from '@hapi/shot';
EOF
