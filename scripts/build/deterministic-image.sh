set -euo pipefail
export TZ=UTC SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-1704067200}
# Order files & fixed mtimes
find dist -type f -print0 | sort -z | xargs -0 touch -d "@$SOURCE_DATE_EPOCH"
tar --sort=name --mtime="@$SOURCE_DATE_EPOCH" -cf rootfs.tar dist/
docker buildx build --provenance=false --metadata-file /tmp/md.json -t "$IMAGE" -f Dockerfile .
