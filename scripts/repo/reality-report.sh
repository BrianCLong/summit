#!/usr/bin/env bash
gh pr list --limit 200 --state all \
  --json number,title,state,mergedAt,author,labels,headRefName,baseRefName \
  --jq \
  'def lab: [.labels[].name]|join(", ");\
[ .[] | {\
      number, title, state,\
      mergedAt: (if .mergedAt==null then "—" else .mergedAt end),\
      author: .author.login,\
      labels: lab,\
      head: .headRefName, base: .baseRefName\
    } ]' \
| jq -r \
'### Current PR status\n\n' \
+ (map(select(.state=="OPEN")) | length | tostring) + " open, " \
+ (map(select(.state=="MERGED")) | length | tostring) + " merged\n\n" \
+ (map("| #\(.number) | \(.state) | \(.title) | \(.author) | \(.labels) |") | join("\n")'