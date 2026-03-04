for file in $(find policy/tests -name "*.rego"); do
    sed -i 's/ if {/ {/g' "$file"
done
