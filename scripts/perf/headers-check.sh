set -euo pipefail
urls=("/" "/assets/")
for u in "${urls[@]}"; do
  curl -sI "$BASE_URL$u" | grep -iE 'cache-control|etag|content-encoding'
done