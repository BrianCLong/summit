#!/bin/bash
git log --grep="fix" --oneline | head -n 150 > tmp_all_commits.txt
cat tmp_all_commits.txt | grep -iE "graphrag|kg|rag|api|gateway|retrieval" | while read commit title; do
    echo "Commit: $commit"
    echo "Title: $title"
    git show --stat $commit
    echo "=================================================="
done
