# Kasi24 — minimal patches to wire secure registration into your existing index.html

You don't need to rewrite the site. Apply these 5 edits. New landlords register on `landlord-registration.html`; the wizard then trusts only `auth.uid()`.

## 0) Add the new page
Upload `landlord-registration.html` next to `index.html`. Link it from the landlord section + mobile nav:

```html
<!-- landlords section, under the List button -->
<p style="margin-top:10px;font-size:.85rem;color:rgba(255,255,255,.7)">New landlord? <a href="landlord-registration.html" style="color:#ffd194;font-weight:800">Register here first</a> — 2 minutes, POPIA-safe.</p>
```

Change both `onclick="openWizard()"` entry points (hero `#landlords` button + bottom-nav `List`) to:
```html
onclick="requireAuthForWizard()"
```

## 1) Gate the wizard (replaces openWizard's first lines)
Add:
```js
async function requireAuthForWizard(){
  const { data:{session} } = await sb.auth.getSession();
  if(!session){ window.location = 'landlord-registration.html'; return; }
  openWizard();
}
```
In `openWizard()`, after loading, prefill Step 5 from the owner's row (never by phone):
```js
async function prefillContact(){
  const { data:{session} } = await sb.auth.getSession();
  if(!session) return;
  const { data } = await sb.from('landlords').select('name,email,phone,whatsapp').eq('id', session.user.id).maybeSingle();
  // NOTE: do NOT select id_number here.
  if(!data) return;
  if(data.name) w_name.value = data.name;
  w_email.value = data.email || session.user.email || '';
  w_email.readOnly = true; // email is the login identity — don't let wizard change it
  if(data.phone){
    const d = data.phone.replace(/^27/,'');
    w_phone.value = (d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6)).trim();
  }
  if(data.whatsapp && data.whatsapp !== data.phone){
    const d = data.whatsapp.replace(/^27/,'');
    w_wa.value = (d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6)).trim();
  }
}
```
Call `prefillContact()` at the end of `openWizard()`.

Normalise phones the same way everywhere (copy from landlord-registration.html):
```js
function normPhone(raw){
  const d = String(raw||'').replace(/\D/g,'');
  if(/^27\d{9}$/.test(d)) return d;
  if(/^0\d{9}$/.test(d)) return '27'+d.slice(1);
  if(/^\d{9}$/.test(d)) return '27'+d;
  return null;
}
```
Use it in `validateW('ws5')` + `collectW('ws5')`. Reject when null. Validate SA ID with the Luhn `saIdValid()` from the new page (optional field, but reject invalid entries).

## 2) Fix submitListing — auth.uid, not phone lookup (THE leak fix)
Replace this block:
```js
// DELETE: phone lookup — allows impersonation + enumeration
// var { data: existing } = await sb.from('landlords').select('id').eq('phone', WD.phone).maybeSingle();
```
With:
```js
const { data:{session} } = await sb.auth.getSession();
if(!session){ window.location='landlord-registration.html'; throw new Error('login required'); }
const landlordId = session.user.id;
// Keep the landlord row in sync with the verified login (no phone matching):
await sb.from('landlords').upsert({
  id: landlordId,
  name: WD.name, phone: normPhone(WD.phone),
  whatsapp: normPhone(WD.wa) || normPhone(WD.phone),
  id_number: WD.idnum || undefined, // omit when empty — never overwrite with blank
  email: session.user.email
},{onConflict:'id'});
// ... then insert listing with landlord_id: landlordId, is_approved:false
```
Also delete any `select('*')` on landlords keyed by phone. Dashboard `loadDashboard()` is already owner-scoped (`.eq('landlord_id', userId)`) — keep it, it only works once RLS owner policies from `fix-rls-secure.sql` are applied.

## 3) Never select id_number to the browser (except masked owner view)
- Wizard: do not read `id_number` at all.
- Dashboard: keep `select('*, unlocks(count)')` on **listings** only (no landlord join). Good as-is.
- Admin: replace `select('*, listings(count)')` on landlords with an admin RPC/view without `id_number` (see SECURITY-REVIEW §3). Until then, at least drop `id_number` from the admin query and fetch it only per-case via a narrow RPC.

## 4) Storage: require login for uploads
Change upload path to `<uid>/<listingId>/…` and set bucket policies per `fix-rls-secure.sql`:
```js
const path = session.user.id + '/' + listingId + '/' + Date.now() + '-' + i + '.' + ext;
```
Update `buildCardImg` / gallery URL helpers — public-read URLs don't change.

Add the same spam brake you use for unlocks to `submitListing` (60 s gap, 5/day/device).

## 5) Run SQL + verify
1. Supabase > SQL Editor > run `fix-rls-secure.sql` (fill in the 2 admin UUIDs).
2. As logged-out anon, confirm: `select * from landlords limit 1` → denied/empty; wizard redirects to registration; listing insert without session fails.
3. As landlord: register → verify email → profile → wizard prefills + locks email → submit → row appears in admin Pending, no PII in anon reads.
4. Upload `landlord-registration.html` + patched `index.html` to Netlify. No Edge Functions needed.
