# Where does each file go? (3 files, 2 destinations)

## 1. `1-WEBSITE-FILE/listing-detail.html`
**Goes to:** your website hosting — the same place as `index.html` and `admin.html`.
**Action:** replace your old `listing-detail.html` with this one.
This is the only file of the three that is part of your actual website.

## 2. `2-SUPABASE-EDGE-FUNCTION-ozow-create-payment/index.ts`
**Goes to:** Supabase Dashboard → Edge Functions → "Deploy a new function" → "Via Editor"
**Name it exactly:** `ozow-create-payment`
**Action:** paste this file's code into the editor box, click Deploy.
Does **not** go anywhere on your website.

## 3. `3-SUPABASE-EDGE-FUNCTION-ozow-webhook/index.ts`
**Goes to:** Supabase Dashboard → Edge Functions → "Deploy a new function" → "Via Editor"
**Name it exactly:** `ozow-webhook`
**Action:** paste this file's code into the editor box, click Deploy, then turn
**OFF** the "Verify JWT" toggle for this function only (find it in the function's
settings after it's deployed).
Does **not** go anywhere on your website.

---

### Quick way to remember it
- Anything with **`.html`** → website hosting.
- Anything with **`.ts`** → Supabase Edge Functions editor (never your website).

### After both functions are deployed
Go to Supabase → Edge Functions → Secrets, and add:
| Key | Value |
|---|---|
| `OZOW_SITE_CODE` | (from your Ozow account) |
| `OZOW_PRIVATE_KEY` | (from your Ozow account — keep this safe) |
| `OZOW_IS_TEST` | `true` (switch to `false` when you go live) |
