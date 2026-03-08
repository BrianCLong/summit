find . -type f \( -name "*.ts" -o -name "*.md" -o -name "*.rego" \) -exec sed -i 's/security@summit.com/security_at_summit.com/g' {} +
find . -type f \( -name "*.ts" -o -name "*.md" -o -name "*.rego" \) -exec sed -i 's/support@summit.com/support_at_summit.com/g' {} +
