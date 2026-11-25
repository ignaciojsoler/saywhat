#!/usr/bin/env bash
# One-time setup of the Vercel project's environment variables and the Turso schema.
#
# Usage (from the repo root, after `vercel link`):
#   bash scripts/vercel-env.sh
#
# It asks for the Turso database URL and token (input hidden), reuses the Cloudflare and
# Google OAuth values from .env.local, generates a fresh BETTER_AUTH_SECRET, pushes the
# Drizzle schema to Turso and stores everything in Vercel. Secrets are never printed.
# Payments (Mercado Pago, Paddle) are left out; add them later with `vercel env add`.
set -euo pipefail

APP_URL="${APP_URL:-https://saywhat-captions.vercel.app}"
TARGET="${TARGET:-production}"

[[ -f .env.local ]] || { echo "Run this from the repo root (.env.local not found)."; exit 1; }
[[ -f .vercel/project.json ]] || { echo "Link the project first: vercel link"; exit 1; }

# value of KEY in .env.local (first match, without surrounding quotes)
from_local() { grep -m1 "^$1=" .env.local | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

read -rp  "Turso DATABASE_URL (libsql://...): " DATABASE_URL
read -rsp "Turso DATABASE_AUTH_TOKEN (hidden): " DATABASE_AUTH_TOKEN; echo
[[ "$DATABASE_URL" == libsql://* ]] || { echo "DATABASE_URL must start with libsql://"; exit 1; }
[[ -n "$DATABASE_AUTH_TOKEN" ]] || { echo "DATABASE_AUTH_TOKEN is empty"; exit 1; }

echo "→ Creating the tables in Turso…"
DATABASE_URL="$DATABASE_URL" DATABASE_AUTH_TOKEN="$DATABASE_AUTH_TOKEN" bun scripts/migrate.ts

declare -A VARS=(
  [APP_URL]="$APP_URL"
  [BETTER_AUTH_URL]="$APP_URL"
  [BETTER_AUTH_SECRET]="$(openssl rand -base64 32)"
  [DATABASE_URL]="$DATABASE_URL"
  [DATABASE_AUTH_TOKEN]="$DATABASE_AUTH_TOKEN"
  [CF_ACCOUNT_ID]="$(from_local CF_ACCOUNT_ID)"
  [CF_API_TOKEN]="$(from_local CF_API_TOKEN)"
  [GOOGLE_CLIENT_ID]="$(from_local GOOGLE_CLIENT_ID)"
  [GOOGLE_CLIENT_SECRET]="$(from_local GOOGLE_CLIENT_SECRET)"
)

for k in "${!VARS[@]}"; do
  v="${VARS[$k]}"
  if [[ -z "$v" ]]; then echo "  skip $k (empty)"; continue; fi
  printf '%s' "$v" | vercel env add "$k" "$TARGET" --force --yes >/dev/null
  echo "  set  $k"
done

echo "Done. Vercel ($TARGET) now has: ${!VARS[*]}"
