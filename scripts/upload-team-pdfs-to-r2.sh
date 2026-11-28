#!/usr/bin/env bash
# Upload the submission PDFs that are too big for Cloudflare Pages (> 25 MiB per file)
# to R2, as  team/pdf/<slug>.pdf . The Pages Function functions/team/pdf/[[path]].js
# serves them at /team/pdf/<slug>.pdf, so the page never needs to know where a PDF lives.
#
# The three files are not in the working tree; they are read straight from git history
# (commit 3c0c07f11 still had them under public/Vista/files/), so nothing big is re-committed.
#
# Needs rclone and an R2 API token with "Object Read & Write" for the bucket below, from the
# Cloudflare account that owns the Pages project (Cendana). Credentials come from env vars only.
#
#   export R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...
#   export R2_BUCKET=kijb-v2                        # bucket bound to MEDIA_BUCKET
#   ./scripts/upload-team-pdfs-to-r2.sh --dry-run   # preview, then run without the flag
#
# Safe to re-run (rclone copy never deletes). Delete the token when you are done.
set -euo pipefail

: "${R2_ACCESS_KEY_ID:?set R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?set R2_SECRET_ACCESS_KEY}"
: "${R2_BUCKET:?set R2_BUCKET}"
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-93b9fb07968d1533270b9df748c223c4}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_COMMIT="3c0c07f11"

# slug|file name under public/Vista/files/ at SRC_COMMIT
PDFS=(
  "apo-mayangan|Proposal Kompetisi inovasi Jabar KIJB 2025_ MUJ ONWJ_APO Mayangan_en.pdf"
  "ngupahan|7. PDF_SLIDE INOVASI [NGUPAHAN KAB BOGOR]_en.pdf"
  "konservasi-mata-air|Paparan Mata Air Menjadi RTH KIJB_en.pdf"
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/team/pdf"

for entry in "${PDFS[@]}"; do
  slug="${entry%%|*}"
  name="${entry#*|}"
  git -C "$ROOT" cat-file -p "${SRC_COMMIT}:public/Vista/files/${name}" > "$TMP/team/pdf/${slug}.pdf"
  echo "extracted ${slug}.pdf ($(du -h "$TMP/team/pdf/${slug}.pdf" | cut -f1))"
done

export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export RCLONE_CONFIG_R2_ACL=private

rclone copy "$TMP/team/pdf" "R2:${R2_BUCKET}/team/pdf" \
  --s3-no-check-bucket --header-upload "Content-Type: application/pdf" \
  --stats 5s --stats-one-line -v "$@"

echo
echo "In the bucket under team/pdf/:"
rclone lsf "R2:${R2_BUCKET}/team/pdf" --format "sp" --separator "  "
