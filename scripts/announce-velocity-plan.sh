#!/usr/bin/env bash
echo "
\U0001F680 **Velocity Plan Kickoff**
- PR Blitz Sessions: 10AM & 3PM daily
- Tag PRs with 'ready-to-merge' after passing tests
- Danger & reviewdog automated review in place
Let's clear the backlog and keep feedback flowing!
" | slack-cli chat send --channel '#dev-updates'

