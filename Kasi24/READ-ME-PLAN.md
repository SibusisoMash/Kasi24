# Kasi24 Plan B — Manual Yoco link (no API keys, no Edge Functions)

Use this if Yoco won't give you API keys. You confirm each R10 by hand in `admin.html`.

## What you need
- Your `-4` `index.html` and `privacy-policy.html` (unchanged — keep them)
- These 2 new files: `listing-detail.html` + `admin.html` from this Plan B set

## Setup (10 minutes, no Supabase functions)
1. Yoco (`app.yoco.com` on computer) → Sales → Online Payment Tools → New Payment Link
   - Amount: **pick ONE price (see PRICE below — e.g. R20)**, Product/name: `Kasi24 Unlock`, Description: `Kasi24 landlord contact unlock`
   - Create → Copy the link (looks like `https://pay.yoco.com/...`)
2. Open Plan B `listing-detail.html` in a text editor → set these TWO things to the SAME number:
   - `UNLOCK_PRICE = 10` near the top → change `10` to your price (e.g. `20`)
   - `YOCO_PAYMENT_LINK = '...'` → paste your Yoco link
   - The Yoco link amount and `UNLOCK_PRICE` MUST match, or tenants pay one price and the site says another.
3. Upload to your host (exact names):
   - `listing-detail.html` → replaces your listing page
   - `admin.html` → replaces your admin page
4. No Edge Functions. No secrets. Nothing to deploy in Supabase for payments.

## PRICE — what to charge
Recommendation: **R20**. Math (Yoco ~2.95%):
- R10 → you keep ~R9.70. Thin, and each manual confirmation costs you 2–5 min.
- R15 → you keep ~R14.55. OK compromise.
- **R20 → you keep ~R19.40.** Best for Plan B — same 2–5 min of your time, double the revenue, still "less than a return taxi fare", which is your whole pitch.
Start at R20. If unlocks feel slow after 2 weeks, drop to R15 as a "launch special" — never below R10 or fees + your time eat it.
If you change price later: make a NEW Yoco link for the new amount, update `UNLOCK_PRICE` to match, and update the R10/R20 display texts in `index.html` (How-it-works card, stats chips, "R10 flat fee" chip) so the site and the Yoco page agree.

## How it works
1. Tenant enters cell number → an `unlocks` row is created as `pending`
2. Your fixed Yoco R10 link opens in a new tab → tenant pays (ask them to use their cell number as reference)
3. Tenant returns and taps **"I've Paid R10 — Show Number"** → row becomes `awaiting`
4. You: `admin.html` → Unlock History → **Needs confirmation** → check Yoco → Activity for the R10 from that number → **Confirm R10 received** → row becomes `complete`
5. Tenant's page polls every 3 seconds and reveals the landlord number automatically once you confirm

## Supabase needs (tables only, no functions)
- Tables must exist: `listings`, `landlords`, `listing_photos`, `unlocks`, `reviews`, `reports`
- `unlocks` needs statuses: `pending` → `awaiting` → `complete`
- The tenant update (`pending` → `awaiting`) needs an UPDATE policy on `unlocks`.
  If tapping "I've Paid" gives a permission error, run this in Supabase → SQL Editor:
  ```sql
  alter table public.unlocks enable row level security;
  create policy "tenants insert own unlock" on public.unlocks
    for insert to anon, authenticated with check (true);
  create policy "tenants mark own unlock paid" on public.unlocks
    for update to anon, authenticated using (true) with check (true);
  ```
  (Open setup: anyone can insert/mark-paid, but only your admin key + the `get_landlord_contact` RPC can read landlord numbers. Tighten later when you upgrade to API auto-confirm.)

## Upgrading later
When Yoco gives you `sk_test_...` / `sk_live_...`, switch to the API set
(`yoco-create-payment` + `yoco-webhook` functions) for fully automatic unlocks.
No data migration needed — same `unlocks` table.
