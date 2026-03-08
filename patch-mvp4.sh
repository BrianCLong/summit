#!/bin/bash
sed -i 's/- uses: pnpm\/action-setup@v4 # v4/- uses: pnpm\/action-setup@v4\n      - name: Setup Node\n        uses: actions\/setup-node@v4\n        with:\n          node-version: "20"\n          cache: "pnpm"/g' .github/workflows/mvp4-gate.yml
