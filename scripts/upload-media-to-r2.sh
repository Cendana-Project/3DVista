#!/usr/bin/env bash
# Upload public/Vista/media to a Cloudflare R2 bucket (keys: media/<...>).
# Needs rclone and an R2 S3 API token (R2 > Manage API tokens > Object Read & Write).
# Credentials come from env vars, nothing is stored on disk or committed.
#
#   export R2_ACCESS_KEY_ID=...        # from the R2 API token
#   export R2_SECRET_ACCESS_KEY=...
#   export R2_BUCKET=your-bucket-name
#   ./scripts/upload-media-to-r2.sh --dry-run    # preview first
#   ./scripts/upload-media-to-r2.sh              # real upload
#
# Safe to re-run: `rclone copy` only uploads missing/changed files and never deletes.
set -euo pipefail

: "${R2_ACCESS_KEY_ID:?set R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?set R2_SECRET_ACCESS_KEY}"
: "${R2_BUCKET:?set R2_BUCKET}"
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-93b9fb07968d1533270b9df748c223c4}"

SRC="$(cd "$(dirname "$0")/.." && pwd)/public/Vista/media"
[ -d "$SRC" ] || { echo "Missing $SRC"; exit 1; }

export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export RCLONE_CONFIG_R2_ACL=private

rclone copy "$SRC" "R2:${R2_BUCKET}/media" \
  --transfers 32 --checkers 64 --s3-no-check-bucket \
  --header-upload "Cache-Control: public, max-age=604800" \
  --stats 10s --stats-one-line -v "$@"

echo
echo "Verify counts (local vs bucket):"
echo -n "local : "; find "$SRC" -type f | wc -l
echo -n "bucket: "; rclone size "R2:${R2_BUCKET}/media" --json | python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])'
