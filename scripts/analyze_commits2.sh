#!/bin/bash
cat tmp_all_commits.txt | grep -iE "graphrag|kg|rag|api|gateway|retrieval" | tail -n +6 | while read commit title; do
    echo "Commit: $commit"
    echo "Title: $title"
    git show -s --format=%B $commit | head -n 15
    echo "=================================================="
done
