#!/bin/bash

# Mock script to export feature flags
# In a real scenario, this would fetch from LaunchDarkly, Split, or a DB table

cat <<EOF
{
  "new_ui_enabled": true,
  "beta_search": false,
  "maintenance_mode": false,
  "max_upload_size_mb": 50
}
EOF
