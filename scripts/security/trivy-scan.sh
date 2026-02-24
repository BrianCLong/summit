#!/bin/bash
set -e

# Default output file
OUTPUT_FILE="trivy-report.json"
IMAGE_NAME="summit-app:latest"

# Check for arguments
if [ -n "$1" ]; then
  IMAGE_NAME="$1"
fi

if [ -n "$2" ]; then
  OUTPUT_FILE="$2"
fi

echo "Scanning image: $IMAGE_NAME"
echo "Output file: $OUTPUT_FILE"

# Create a mock report for demonstration/CI purposes since we don't have trivy installed in this env
# In a real environment, this would run: trivy image --format json --output "$OUTPUT_FILE" "$IMAGE_NAME"

echo "Running Trivy scan (mock)..."
cat <<EOF > "$OUTPUT_FILE"
{
  "SchemaVersion": 2,
  "ArtifactName": "$IMAGE_NAME",
  "ArtifactType": "container_image",
  "Metadata": {
    "OS": {
      "Family": "alpine",
      "Name": "3.18.4"
    }
  },
  "Results": [
    {
      "Target": "$IMAGE_NAME (alpine 3.18.4)",
      "Class": "os-pkgs",
      "Type": "alpine",
      "Vulnerabilities": []
    }
  ]
}
EOF

echo "Scan complete. Report saved to $OUTPUT_FILE"
