#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Manual deploy to Cloudflare Pages.
#
# Usage:
#   ./scripts/deploy.sh                 # build + deploy to production (main)
#   ./scripts/deploy.sh my-branch       # deploy as a preview on a named branch
#
# Requires:
#   - CLOUDFLARE_API_TOKEN   (Pages: Write/Read, scoped to your account)
#   - CLOUDFLARE_ACCOUNT_ID
#   Export them in your shell or put them in .env.local (auto-loaded below).
#   NEVER commit real values. .env* are gitignored.
#
# This mirrors the CI pipeline in .github/workflows/deploy.yml so local and
# automated deploys behave the same.
# -----------------------------------------------------------------------------
set -euo pipefail

PROJECT_NAME="english-for-tom"
OUTPUT_DIR="out"
BRANCH="${1:-main}"

cd "$(dirname "$0")/.."

# Load local credentials if present (not committed).
if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

# Fail early with a clear message if credentials are missing.
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (see .env.example)}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID (see .env.example)}"

echo "==> Quality gates"
npm run typecheck
npm run lint
npm test

echo "==> Building static export"
npm run build

echo "==> Deploying '$OUTPUT_DIR' to Cloudflare Pages project '$PROJECT_NAME' (branch: $BRANCH)"
npx wrangler pages deploy "$OUTPUT_DIR" \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH"

echo "==> Done. Production URL: https://$PROJECT_NAME.pages.dev"
