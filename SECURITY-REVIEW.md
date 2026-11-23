# Kasi24 — Landlord registration security review (leak-focused)

Date: 2026-11-23. Scope: `index.html` auth panel + 6-step wizard, `listing-detail.html` unlock flow, `admin.html`, RLS as described in README.

Rule: landlord phone / WhatsApp / email / SA ID must **never** reach a stranger's browser except phone+WhatsApp **after** a `complete` unlock, via `get_landlord_contact()` only.

## Critical (fix before launching registration)

### 1. `submitListing()` looks up landlord by phone — impersonation + enumeration
`index.html` ~L1636:
```js
await sb.from('landlords').select('id').eq('phone', WD.phone).maybeSingle()
```
- If `landlords` is readable to anon (common misconfig to "make dashboard work"), anyone can enumerate which phone numbers are landlords.
- Worse: anyone who knows a victim's phone number submits a listing with that number and **inherits the victim's `landlord_id`**. Listings, unlock counts, and contact flows then attach to the victim.
- Phone strings are stored raw (`071 234 5678` vs `0712345678`), so the same person creates duplicate landlord rows.

Fix: never look up by phone. Require login, use `auth.uid()` as `landlord_id`:
```js
const { data: { session } } = await sb.auth.getSession();
if (!session) { openAuthPanel('register'); return; }
landlordId = session.user.id; // + upsert landlords { id: landlordId, ... } with .eq('id', landlordId)
```
Gate `openWizard()` the same way.

### 2. Wizard + registration are not login-gated
`openWizard()` resets state and opens for anyone, including logged-out / unverified users. `submitListing()` then inserts into `landlords` + `listings` as anon if RLS allows anon insert.

Fix: `openWizard()` → if no session, open registration panel instead. After listing insert, set `landlord_id = auth.uid()`, `is_approved = false`. RLS: `listings` INSERT only when `auth.uid() = landlord_id`.

### 3. `admin.html` pulls `select('*, ...)` on landlords — full PII in admin browser
`loadLandlords()` selects every column, including `phone`, `email`, and `id_number` for **all** landlords into any browser that passes the client-side email check. Client-side `ADMIN_EMAILS.includes()` is bypassable; if RLS is loose, anyone gets the whole table. Even when RLS is correct, one XSS/browser extension in the admin session exfiltrates everything.

Fix:
- Never `select *` on `landlords` from the client. Expose an admin-only RPC / view **without** `id_number`, e.g. `admin_landlords` (id, name, phone, email, created_at, listing_count) accessible only to the 2 admin UIDs.
- Keep `id_number` write-only from the client: INSERT allowed, SELECT denied for everyone except a server-side check. Read it only via a narrow admin RPC when you actually verify someone.

### 4. SA ID stored in plaintext, collected without validation, kept forever
Wizard Step 5 takes a 13-digit SA ID with no checksum, stores `id_number` raw in `landlords`, and it lives forever. Under POPIA this is the highest-risk field you hold. Privacy policy already flags this.

Fix:
- Validate: 13 digits + Luhn + DOB sane, else reject with "check your ID number".
- Minimise: ask for ID **only** at listing time, explain why ("accountability for fake listings, never shown"), link privacy policy.
- Retain short: after manual verification, replace with `id_verified = true` + last-3-digits reference, or hash. Do not keep returning it to any client.

## High

### 5. Contact fields in wizard are free-text and decoupled from auth
Step 5 lets anyone type any name/email/phone, different from the logged-in account. No verification that `w_email == auth email` or that the phone belongs to the user. Fake numbers, typos, and impersonation flow straight into `landlords`.

Fix: when logged in, prefill name/email/phone from `auth` + `landlords` row, make email read-only, normalise phone to `27XXXXXXXXX` everywhere (registration, wizard, unlock lookup). SMS verification (ClickSend) before first listing goes live.

### 6. Open photo uploads
Bucket `listing-photos`: "anyone can upload JPG/PNG/WebP" (README). Anon upload = storage-spam / illegal-content / cost attack. Client checks extension/size, but bucket must enforce it too.

Fix: INSERT requires `auth.role() = 'authenticated'`, path must start with `auth.uid() || '/'`, 5 MB limit via policy or Edge Function. Keep public SELECT (photos are public by design).

### 7. RLS must not rely on client-side admin check
`admin.html` trusts `ADMIN_EMAILS` in JS. An attacker with the anon key calls the same tables directly.

Fix (in `fix-rls-secure.sql`): `landlords` / `listings` / `unlocks` policies check `auth.uid() IN (<admin UUID1>, <admin UUID2>)` or `auth.jwt()->>'email' IN (...)`. Anon gets: `listings` SELECT only where `is_active AND is_approved` (no joins to landlords), `get_landlord_name()` (name only), `get_landlord_contact()` only when the matching unlock is `complete`. No direct `landlords` SELECT for anon. Owner gets own rows only (`id = auth.uid()`, `landlord_id = auth.uid()`).

### 8. No rate limits on registration / listing submit
Spam brake exists only for unlocks/reviews/reports. Registration + listing submit have none → mass fake landlords/listings.

Fix: same pattern — 60 s gap + max 5 listings/day/device + CAPTCHA/turnstile on registration when abuse starts.

## Medium / hygiene (already mostly good — keep)

- `listing-detail.html` RPC pattern is correct: name-only first, contact only after `complete`. Do not add `landlords(phone)` selects anywhere else. Dashboard `select('*, unlocks(count)')` is okay **only** with owner-only RLS (`landlord_id = auth.uid()`); otherwise it leaks other landlords' listings.
- HTML-escaping (`escapeHtml`) is used for titles/notes/areas — keep it on every new field, including the new registration page.
- `_headers` CSP + `listing-detail` phone-modal normalisation (`27...`) are good — reuse the same normaliser in registration.
- POPIA consent: current `viewRegister` has **no** consent checkbox and no privacy link; wizard has a listing-accuracy checkbox but not a POPIA one. New registration adds: "I agree to the Privacy Policy and POPIA processing" (required) + "I confirm I may list this property" at listing time.

## What the new files do

- `landlord-registration.html` — standalone registration that binds everything to `auth.uid()`, validates SA phone + SA ID (Luhn), requires POPIA consent, normalises to `27...`, never queries by phone, never selects `id_number` back.
- `fix-rls-secure.sql` — drops the leaky patterns: no anon `landlords` access, owner-only + admin-only, listings anon-live-approved only, storage auth-gated.
- `INDEX-PATCHES.md` — minimal edits to your existing `index.html` so the wizard uses the same safe pattern (gate, prefill/lock, `auth.uid()` submit).
