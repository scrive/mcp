#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

WORKFLOW=".github/workflows/docs.yml"

extract() {
  grep -E "^[[:space:]]+$1:" "$WORKFLOW" | head -1 \
    | sed -E "s/^[[:space:]]+$1:[[:space:]]*//; s/[[:space:]]*#.*$//; s/^[\"']//; s/[\"']$//"
}

HUGO_VERSION=$(extract HUGO_VERSION)
HUGO_BOOK_SHA=$(extract HUGO_BOOK_SHA)

if [[ -z "$HUGO_VERSION" || -z "$HUGO_BOOK_SHA" ]]; then
  echo "Error: failed to extract HUGO_VERSION or HUGO_BOOK_SHA from $WORKFLOW" >&2
  exit 1
fi

if ! command -v hugo >/dev/null 2>&1; then
  cat <<'EOF' >&2
Hugo is not installed. Install it first:
  macOS    brew install hugo
  Linux    sudo apt-get install hugo  (or download from https://github.com/gohugoio/hugo/releases)
  Windows  scoop install hugo  (or winget install Hugo.Hugo)
EOF
  exit 1
fi

local_hugo=$(hugo version | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | sed 's/^v//')
if [[ "$local_hugo" != "$HUGO_VERSION" ]]; then
  echo "Warning: local Hugo $local_hugo differs from CI ($HUGO_VERSION). Output may differ from production." >&2
fi

if [[ ! -d docs/themes/hugo-book ]]; then
  echo "Fetching hugo-book theme..."
  mkdir -p docs/themes
  curl -sL "https://github.com/alex-shpak/hugo-book/archive/${HUGO_BOOK_SHA}.tar.gz" \
    | tar -xz -C docs/themes
  mv "docs/themes/hugo-book-${HUGO_BOOK_SHA}" docs/themes/hugo-book
fi

{
  printf -- '---\ntitle: scrive-mcp\ntype: docs\n---\n\n'
  cat README.md
} > docs/content/_index.md

{
  printf -- '---\ntitle: License\nweight: 99\n---\n\n```text\n'
  cat LICENSE
  printf '\n```\n'
} > docs/content/license.md

hugo serve --source docs
