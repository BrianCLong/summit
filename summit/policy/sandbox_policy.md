# Sandbox Policy

## Shell Execution
- **Default**: Require approval for all commands.
- **Allowlist**: `echo`, `ls`, `pwd`, `cat`, `grep`, `find`.
- **Blocked**: `rm`, `mv` (write operations) without explicit approval.
