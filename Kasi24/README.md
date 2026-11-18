# Kasi24
Kasi24 is a rental marketplace for Kwamhlanga, Mpumalanga, connecting tenants to landlords without agents or middlemen.

# Kasi24 – Find Your Room in Kwamhlanga

**Kasi24 is a rental marketplace built specifically for Kwamhlanga, Mpumalanga. Tenants pay R20 to unlock landlord contact details. Landlords list for free.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-0894A1?style=for-the-badge&logo=netlify&logoColor=white)](https://your-netlify-url.netlify.app)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Yoco](https://img.shields.io/badge/Yoco-Payments-FF6B35?style=for-the-badge)](https://yoco.com)

---

## 📌 The Problem

Finding a room, back room, flat, or house to rent in Kwamhlanga is broken:

- **Notice boards at Spar and Shoprite** – You have to physically go to the shops every time to check for new listings
- **WhatsApp groups** – Sporadic, chaotic, no search, no way to see everything in one place
- **Facebook Marketplace** – Full of scams and stale posts
- **No agent fees?** – Actually, agents take cuts or tenants waste time calling unavailable properties

**Kasi24 fixes all of this.**

---

## 🚀 The Solution

| For Tenants | For Landlords |
|-------------|----------------|
| Browse listings for free | List your property for free |
| Filter by area, type, and price | 6-step wizard with photo uploads |
| Pay R20 to unlock landlord's number | Dashboard to manage listings |
| Leave feedback after unlocking | View how many tenants unlocked your number |
| Save favourites to wishlist | Boost your listing for R20/week |

**No subscriptions. No monthly fees. You only pay to connect.**

---

## 🏗️ Built With

| Technology | Purpose |
|------------|---------|
| HTML5, CSS3, Vanilla JavaScript | Frontend (no build step) |
| Supabase (PostgreSQL) | Database, Auth, Storage |
| Yoco Payment Links (Plan B) | Manual R20 payment links, owner confirms each payment |
| ClickSend | SMS verification (in progress) |
| Font Awesome 6.5.0 | Icons |
| Google Fonts (Sora, Nunito) | Typography |

---

## 📁 Project Structure

```
kasi24/
├── index.html            # Homepage (browse, search, landlord section)
├── listing-detail.html   # Listing page + Yoco Plan B unlock flow
├── admin.html            # Admin panel (approvals, confirm payments)
├── privacy-policy.html   # POPIA privacy policy
└── README.md             # This file
```

---

## ✨ Features (Detailed)

### For Tenants (No Account Required)

- ✅ Browse listings with skeletons while loading
- ✅ Filter by area (Slovo Park, Extension 1-3, CPA, Phola Park, Mandela Village, Hospital View)
- ✅ Filter by property type (Room, Back Room, Flat, House)
- ✅ Price range slider (R500 – R8,000)
- ✅ Save favourites to localStorage
- ✅ View full listing details (photos, rent, deposit, included utilities, amenities, preferences)
- ✅ Pay R20 via Yoco to unlock landlord's phone number
- ✅ WhatsApp share button for listings
- ✅ Report fake/stale listings

### For Landlords (Account Required)

- ✅ Register with email + phone number
- ✅ Email verification via Supabase Auth
- ✅ 6-step listing wizard:
  1. Basics (property type, area, available date)
  2. Pricing (rent, deposit, included utilities)
  3. Details (bedrooms, bathroom, furnished, tenant preferences)
  4. Extras (amenities, notes)
  5. Contact (name, email, phone, WhatsApp, SA ID number)
  6. Photos (up to 10 images, drag & drop, reorder)
- ✅ Dashboard to manage listings:
  - Edit listing details
  - Mark as taken / available
  - Delete listing
  - View unlock counts
- ✅ Listings require admin approval before going live

### For Admin

- ✅ Secure login (restricted to admin@kasi24.co.za)
- ✅ Approve or reject pending listings
- ✅ Manage live listings (mark taken, delete, reactivate)
- ✅ View all registered landlords
- ✅ Confirm R20 payments and view unlock history with tenant phone numbers

### Payment Flow (Plan B — no API keys, no Edge Functions)

1. Tenant clicks "Unlock for R20"
2. Enters SA phone number
3. Creates `pending` unlock record in Supabase
4. Fixed Yoco R20 payment link opens in a new tab (tenant uses their cell number as reference)
5. Tenant returns and taps "I've Paid R20" → record becomes `awaiting`
6. Owner checks Yoco Activity for the R20, taps **Confirm R20 received** in `admin.html` → record becomes `complete`
7. Tenant's page polls every 3 seconds and displays the landlord's phone number + WhatsApp link

---

## 🗄️ Database Schema

### `landlords`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (matches Supabase Auth) |
| name | TEXT | Landlord's full name |
| phone | TEXT | Verified (SMS planned) |
| whatsapp | TEXT | Optional, defaults to phone |
| email | TEXT | From auth |
| id_number | TEXT | Private, never shown |
| created_at | TIMESTAMP | Auto-set |

### `listings`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| landlord_id | UUID | Foreign key to landlords |
| type | TEXT | room / backroom / flat / house |
| title | TEXT | Auto-generated |
| area | TEXT | Suburb/area name |
| rent | INTEGER | Monthly rent in Rands |
| deposit | INTEGER | Optional deposit |
| available_from | DATE | Availability date |
| bedrooms | TEXT | 1,2,3,4+, bachelor |
| bathroom | TEXT | private / shared / ensuite / outside |
| furnished | TEXT | unfurnished / furnished / semi |
| included | TEXT[] | water, electricity, wifi, refuse, security, dstv |
| amenities | TEXT[] | parking, wifi, laundry, yard, etc. |
| preferences | TEXT[] | no_smokers, no_pets, working, students, etc. |
| notes | TEXT | Additional description |
| is_active | BOOLEAN | Soft delete / taken status |
| is_approved | BOOLEAN | Admin approval required |
| created_at | TIMESTAMP | Auto-set |

### `listing_photos`
| Column | Type |
|--------|------|
| id | UUID |
| listing_id | UUID |
| storage_path | TEXT |
| is_primary | BOOLEAN |
| sort_order | INTEGER |

### `unlocks`
| Column | Type |
|--------|------|
| id | UUID |
| listing_id | UUID |
| landlord_id | UUID |
| tenant_phone | TEXT |
| amount_paid | INTEGER (20) |
| payment_status | TEXT (pending / awaiting / complete) |
| unlocked_at | TIMESTAMP |

### `reports`
| Column | Type |
|--------|------|
| id | UUID |
| listing_id | UUID |
| reason | TEXT |
| created_at | TEXT |

---

## 🛡️ Identified Risks & Mitigations

| Risk | Mitigation |
|------|-------------|
| Landlord fraud / fake listings | SMS verification (planned), ID collection, tenant comments (planned), listing expiry (30 days planned) |
| Tenant shares unlocked number | Accept some sharing; encourage sharing listing link instead; temporary numbers (future) |
| Stale / already-taken listings | Admin approval, tenant reports, expiry system (planned) |
| No landlord incentive | Free listings expire; boosts cost R20; good reviews earn "Verified" badge (planned) |
| Tenant pays but owner is slow to confirm | Tenant page polls automatically; WhatsApp fallback number on the waiting screen |
| Manual admin approval bottleneck | Automated flagging (planned); community manager (future) |
| Free competitors (Facebook, Gumtree) | R20 = quality filter, not cost; local focus; tenant feedback loop |
| Legal compliance (POPIA, CPA) | Privacy policy; consent checkboxes; minimal data collection |

---

## 🚦 Roadmap

### Phase 1 – Completed (MVP)
- ✅ Listing creation wizard (6 steps)
- ✅ Photo upload (up to 10 images)
- ✅ Browse + filter listings
- ✅ Yoco payment integration (Plan B manual link)
- ✅ Landlord dashboard
- ✅ Admin panel
- ✅ Wishlist (localStorage)
- ✅ WhatsApp sharing
- ✅ Report listing

### Phase 2 – In Progress
- 🔄 SMS verification for landlords (ClickSend)
- 🔄 Tenant comments/reviews on listings
- 🔄 Listing expiry (30 days) + renewal
- 🔄 Boost feature (R20/week)
- 🔄 Automatic Yoco confirmation via Checkout API (replaces manual confirm)

### Phase 3 – Post-Competition
- ⏳ Real estate agency subscriptions (R199–R499/month)
- ⏳ Temporary/forwarding phone numbers
- ⏳ Automated image compression
- ⏳ Full-text search
- ⏳ Mobile apps (Capacitor or Flutter)

---

## 💰 Business Model

| User Type | Pays | Receives |
|-----------|------|----------|
| Tenant | R20 (one-time per listing) | Landlord's phone number + ability to leave feedback |
| Individual landlord | R0 (free) | Standard placement in search results |
| Individual landlord (boost) | R20/week | Featured placement + "Boosted" badge |
| Real estate agency (Phase 2) | R199–R499/month | Unlimited listings, analytics, priority support |

---

## 🔧 Local Development

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari)
- Supabase account (free tier)
- One fixed Yoco payment link for R20 (Online Payment Tools → New Payment Link)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SibusisoMash/Kasi24.git
   cd Kasi24
   ```

2. **Configure the payment link**
   - Open `listing-detail.html`, set `YOCO_PAYMENT_LINK` to your Yoco link and `UNLOCK_PRICE = 20`.

3. **Configure Supabase**
   - Create the tables in `🗄️ Database Schema` above (or import your existing project).
   - Set the anon key in the frontend files and deploy the `get_landlord_contact` RPC.
   - No Edge Functions needed for Plan B.

4. **Run it — no build step**
   - Open `index.html` in a browser, or serve the folder statically:
   ```bash
   npx serve .
   ```
   - Upload the four `.html` files to Netlify (or any static host) to go live. Replace `your-netlify-url` in the badge above with your real URL.
