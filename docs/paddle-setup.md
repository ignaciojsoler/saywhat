# Paddle setup (USD payments)

Saywhat sells prepaid credit packs through Paddle, which acts as merchant of record: it sells to
the buyer, collects and remits sales tax/VAT, and pays you out. Mercado Pago is left out for now;
with only Paddle configured, every visitor sees USD pricing.

The app is already wired (`src/lib/billing/paddle.ts`, `/pay`, `/api/webhooks/paddle`,
`/api/checkout/return`). You only need an account, five values and two URLs.

`<APP_URL>` below is the public URL: `https://saywhat.ignaciosoler.com`.

## 1. Sandbox first (no approval needed)

1. Sign up at https://sandbox-vendors.paddle.com/signup.
2. **Catalog → Products → New product**
   - Name: `Saywhat video credits`
   - Tax category: *Standard digital goods* (or *SaaS*)
   - Don't create prices: the app creates one per checkout from `src/lib/billing/packs.ts`.
   - Copy the `pro_…` id → `PADDLE_PRODUCT_ID`.
3. **Developer tools → Authentication**
   - New API key with read + write on transactions → `PADDLE_API_KEY`.
   - New client-side token (`test_…`) → `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.
4. **Checkout → Checkout settings → Default payment link**: `<APP_URL>/pay`.
5. **Developer tools → Notifications → New destination**
   - URL: `<APP_URL>/api/webhooks/paddle`
   - Events: `transaction.paid`, `transaction.completed`, `transaction.payment_failed`
   - Copy the secret key → `PADDLE_WEBHOOK_SECRET`.
6. Load the values into Vercel and redeploy (values are typed into hidden prompts, never shown):

   ```bash
   bash scripts/paddle-env.sh
   vercel deploy --prod --yes
   ```

7. Test on `<APP_URL>/app/credits` with card `4242 4242 4242 4242`, CVC `100`, any future date.
   Credits should land right after the redirect; the webhook credits them too (idempotent).

## 2. Going live

1. Create the live account at https://vendors.paddle.com and complete verification
   (identity, business details, payout method: USD bank transfer or Payoneer).
2. Paddle reviews the website before approving. It needs to see, on `<APP_URL>`:
   - pricing (already on the landing),
   - **Terms of service, Privacy policy and Refund policy pages — Saywhat doesn't have these yet**,
   - a way to contact you.
3. Approve the domain `saywhat.ignaciosoler.com` in **Checkout → Website approval**.
4. Repeat steps 2–5 of the sandbox section in the live dashboard (ids and keys differ;
   the client token starts with `live_…`).
5. Run `bash scripts/paddle-env.sh` again, answering `production` for the environment, and redeploy.
