#!/bin/bash
# Adding references to build json to fix typecheck
sed -i '/"include": \[/a \    "../packages/computer-vision/src/**/*",\n    "../libs/context-shell/node/**/*",' server/tsconfig.build.json || true
