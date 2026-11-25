#!/usr/bin/env bash
# Store the Paddle credentials in the linked Vercel project (see docs/paddle-setup.md).
# Every value is typed into a hidden prompt and never printed. Redeploy afterwards.
set -euo pipefail

TARGET="${TARGET:-production}"
[[ -f .vercel/project.json ]] || { echo "Link the project first: vercel link"; exit 1; }

read -rp "Paddle environment [sandbox/production] (sandbox): " PADDLE_ENV
PADDLE_ENV="${PADDLE_ENV:-sandbox}"
[[ "$PADDLE_ENV" == sandbox || "$PADDLE_ENV" == production ]] || { echo "Use sandbox or production"; exit 1; }

ask() { local v; read -rsp "$1 (hidden): " v; echo >&2; [[ -n "$v" ]] || { echo "$1 is empty" >&2; exit 1; }; printf '%s' "$v"; }
PADDLE_PRODUCT_ID="$(ask PADDLE_PRODUCT_ID)"
PADDLE_API_KEY="$(ask PADDLE_API_KEY)"
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="$(ask NEXT_PUBLIC_PADDLE_CLIENT_TOKEN)"
PADDLE_WEBHOOK_SECRET="$(ask PADDLE_WEBHOOK_SECRET)"

[[ "$PADDLE_PRODUCT_ID" == pro_* ]] || { echo "PADDLE_PRODUCT_ID should start with pro_"; exit 1; }

for k in PADDLE_ENV PADDLE_PRODUCT_ID PADDLE_API_KEY NEXT_PUBLIC_PADDLE_CLIENT_TOKEN PADDLE_WEBHOOK_SECRET; do
  # Paddle's client-side token is public by design (Paddle.js needs it in the browser)
  type=secret; [[ "$k" == NEXT_PUBLIC_* || "$k" == PADDLE_ENV ]] && type=config
  printf '%s' "${!k}" | vercel env add "$k" "$TARGET" --type "$type" --force --yes >/dev/null
  echo "  set  $k"
done
echo "Done. Redeploy so the client token is baked into the build: vercel deploy --prod --yes"
