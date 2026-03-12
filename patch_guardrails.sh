#!/bin/bash
sed -i '/- name: Install pnpm/d' .github/workflows/agent-guardrails.yml
sed -i '/uses: pnpm\/action-setup@v4/d' .github/workflows/agent-guardrails.yml
awk '
BEGIN { skip = 0 }
/- name: Setup Node/ {
  if (count++ == 0) {
    skip = 1
  }
}
skip && /with:/ { skip = 1; next }
skip && /node-version: "18"/ { skip = 0; next }
skip { next }
{ print }
' .github/workflows/agent-guardrails.yml > tmp.yml && mv tmp.yml .github/workflows/agent-guardrails.yml
