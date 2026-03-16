for file in $(grep -rl "10.0.0.0.0" .github/workflows/); do
    sed -i 's/10.0.0.0.0/10.0.0/g' "$file"
done
